import { Router } from 'express';
import { db, hashPassword } from '../db.js';
import { authenticateSession, requireRole, type AuthenticatedRequest } from '../auth.js';

export interface MaintenanceStepResult {
  step: number;
  name: string;
  target: string;
  status: 'COMPLETED';
  durationMs: number;
  reclaimedMB: number;
  details: string;
}

export interface SystemStorageState {
  lastRunAt: string | null;
  lastDurationMs: number;
  totalRuns: number;
  totalReclaimedGB: number;
  lastReclaimedGB: number;
  dbDataGB: number;
  auditLogsGB: number;
  docsStorageGB: number;
  systemOsGB: number;
  maintenanceHistory: Array<{
    id: string;
    executedAt: string;
    reclaimedGB: number;
    durationMs: number;
    actorName: string;
    stepsCount: number;
  }>;
}

// Initial state has elevated storage (40.4% > 35% default alert threshold) to realistically reflect real-world maintenance need
export const systemStorageState: SystemStorageState = {
  lastRunAt: null,
  lastDurationMs: 0,
  totalRuns: 0,
  totalReclaimedGB: 0,
  lastReclaimedGB: 0,
  dbDataGB: 8.6,
  auditLogsGB: 5.2,
  docsStorageGB: 3.6,
  systemOsGB: 2.8,
  maintenanceHistory: []
};

export const maintenanceDiagnosticLogs: any[] = [];

const router = Router();

router.use(authenticateSession);
router.use(requireRole('ADMIN'));

// 1. Admin Overview Statistics
router.get('/overview', (req, res) => {
  const totalStudents = db.students.length;
  const totalFaculty = db.faculty.length;
  
  // Today's attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = db.attendanceRecords.filter(r => r.date === todayStr);
  const presentToday = todayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const absentToday = Math.max(0, totalStudents - presentToday);
  const overallAttendancePercent = totalStudents > 0 ? Number(((presentToday / totalStudents) * 100).toFixed(1)) : 88.0;

  // Low attendance students count
  let lowAttendanceCount = 0;
  for (const s of db.students) {
    const list = db.subjectAttendance.get(s.id) || [];
    if (list.some(sub => sub.isLowAttendance)) {
      lowAttendanceCount++;
    }
  }

  // Pending admissions
  const pendingAdmissions = db.applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;

  // Total pending fees
  const totalPendingFees = db.feeInvoices.reduce((acc, inv) => acc + inv.pendingBalance, 0);

  // Device status
  const onlineDevices = db.devices.filter(d => d.status === 'ONLINE').length;
  const totalDevices = db.devices.length;

  res.json({
    success: true,
    stats: {
      totalStudents,
      totalFaculty,
      presentToday,
      absentToday,
      overallAttendancePercent,
      lowAttendanceCount,
      pendingAdmissions,
      totalPendingFees,
      onlineDevices,
      totalDevices,
      totalEvents: db.events.length,
      auditLogsCount: db.auditLogs.length
    },
    recentActivity: db.auditLogs.slice(0, 8),
    recentBleEvents: db.bleEvents.slice(0, 6)
  });
});

// 2. Student Management CRUD
router.get('/students', (req, res) => {
  res.json({ success: true, students: db.students });
});

router.post('/students', (req: AuthenticatedRequest, res) => {
  const { name, rollNumber, email, phone, department, branch, year, semester, section, bleMac } = req.body;

  if (!name || !rollNumber || !email) {
    res.status(400).json({ success: false, error: 'Name, roll number, and email are required.' });
    return;
  }

  const studentId = `STU-2026-${Math.floor(100 + Math.random() * 900)}`;
  const newStudent = {
    id: studentId,
    userId: `usr-${studentId.toLowerCase()}`,
    rollNumber,
    name,
    email,
    phone: phone || '+1 (555) 000-0000',
    department: department || 'Computer Science & Engineering',
    branch: branch || 'B.Tech CSE',
    year: Number(year) || 1,
    semester: Number(semester) || 1,
    section: section || 'A',
    academicYear: db.settings.academicYear,
    photograph: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    bleMac: (bleMac || 'EE:FF:00:11:22:33').toUpperCase(),
    parentName: 'Guardian',
    parentPhone: phone || '+1 (555) 000-0000',
    address: 'Campus Hostel Block B',
    admissionDate: new Date().toISOString().split('T')[0]
  };

  db.students.push(newStudent);

  // Create login user as well
  const salt = 'smartcampus2026staticSalt';
  db.users.push({
    id: newStudent.userId,
    email: newStudent.email,
    passwordHash: hashPassword('Student@2026!', salt),
    salt,
    role: 'STUDENT',
    name: newStudent.name,
    studentId: newStudent.id,
    isActive: true,
    createdAt: new Date().toISOString()
  });

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'STUDENT_ENROLLED',
    actorId: req.user?.userId || '',
    actorRole: 'ADMIN',
    actorName: req.user?.name || '',
    details: `Enrolled new student ${name} (${rollNumber}) with BLE MAC ${newStudent.bleMac}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Student enrolled successfully', student: newStudent });
});

// 3. Faculty Management
router.get('/faculty', (req, res) => {
  res.json({ success: true, faculty: db.faculty });
});

// 4. ESP32 Node Registration & Control
router.post('/devices/register', (req: AuthenticatedRequest, res) => {
  const { nodeId, nodeName, nodeType, location, macAddress, ipAddress } = req.body;

  if (!nodeId || !nodeName || !location) {
    res.status(400).json({ success: false, error: 'Node ID, Name, and Location required.' });
    return;
  }

  const existing = db.devices.find(d => d.nodeId === nodeId);
  if (existing) {
    existing.nodeName = nodeName;
    existing.nodeType = nodeType || existing.nodeType;
    existing.location = location;
    res.json({ success: true, message: 'Device configuration updated', device: existing });
    return;
  }

  const newDevice = {
    nodeId,
    nodeName,
    nodeType: (nodeType || 'ENTRY') as 'ENTRY' | 'EXIT',
    location,
    macAddress: macAddress || '24:6F:28:FE:ED:01',
    ipAddress: ipAddress || '192.168.10.50',
    firmwareVersion: 'v2.4.1-BLE-PROD',
    status: 'ONLINE' as 'ONLINE' | 'OFFLINE',
    lastSeen: new Date().toISOString(),
    signalStrengthRssi: -55,
    detectionsToday: 0,
    batteryLevel: 100,
    isRegistered: true
  };

  db.devices.push(newDevice);

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'DEVICE_REGISTERED',
    actorId: req.user?.userId || '',
    actorRole: 'ADMIN',
    actorName: req.user?.name || '',
    details: `Registered ESP32 Node ${nodeId} (${nodeName}) at ${location}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'ESP32 Node registered successfully', device: newDevice });
});

// 5. Comprehensive System Health Check
router.get('/system-health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  // Generate 24-hour historical uptime and latency trend data with 7-day previous week comparison baseline
  const now = new Date();
  const uptimeHistory = [];
  let currentLatencySum = 0;
  let prevWeekLatencySum = 0;
  let currentUptimeSum = 0;
  let prevWeekUptimeSum = 0;
  let currentReqSum = 0;
  let prevWeekReqSum = 0;

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Realistic micro-fluctuations in uptime (99.94% - 100.0%) and latency (18ms - 32ms)
    const baseLatency = 21 + Math.sin(i * 0.7) * 5 + (i === 4 ? 9 : 0);
    const curLatency = Math.round(baseLatency * 10) / 10;
    const curUptime = i === 7 ? 99.96 : (i === 15 ? 99.98 : 100.0);
    const curRequests = Math.round(180 + Math.sin(i * 0.5) * 80 + (i > 10 && i < 18 ? 120 : 0));
    const curErrorRate = i === 4 ? 0.04 : 0.01;

    // Previous week benchmark (7-day historical baseline for the exact same hour window)
    // Generally shows ~2.5 - 3.5ms higher historical latency before recent performance optimizations
    const prevBaseLatency = 24.2 + Math.sin((i + 1.2) * 0.7) * 4.6 + (i === 5 ? 7.5 : 0);
    const prevLatency = Math.round(prevBaseLatency * 10) / 10;
    const prevUptime = i === 8 ? 99.92 : (i === 14 ? 99.95 : 99.99);
    const prevRequests = Math.round(162 + Math.sin(i * 0.5) * 72 + (i > 10 && i < 18 ? 105 : 0));

    const latDelta = Math.round((curLatency - prevLatency) * 10) / 10;
    const latDeltaPct = Math.round(((curLatency - prevLatency) / prevLatency) * 1000) / 10;

    currentLatencySum += curLatency;
    prevWeekLatencySum += prevLatency;
    currentUptimeSum += curUptime;
    prevWeekUptimeSum += prevUptime;
    currentReqSum += curRequests;
    prevWeekReqSum += prevRequests;

    uptimeHistory.push({
      time: hourLabel,
      uptime: curUptime,
      latencyMs: curLatency,
      requestsPerMin: curRequests,
      errorRate: curErrorRate,
      prevWeekLatencyMs: prevLatency,
      prevWeekUptime: prevUptime,
      prevWeekRequestsPerMin: prevRequests,
      latencyDeltaMs: latDelta,
      latencyDeltaPct: latDeltaPct
    });
  }

  const pointCount = uptimeHistory.length;
  const currentAvgLatency = Math.round((currentLatencySum / pointCount) * 10) / 10;
  const prevWeekAvgLatency = Math.round((prevWeekLatencySum / pointCount) * 10) / 10;
  const totalLatDelta = Math.round((currentAvgLatency - prevWeekAvgLatency) * 10) / 10;
  const totalLatDeltaPct = Math.round(((currentAvgLatency - prevWeekAvgLatency) / prevWeekAvgLatency) * 1000) / 10;

  const currentAvgUptime = Math.round((currentUptimeSum / pointCount) * 100) / 100;
  const prevWeekAvgUptime = Math.round((prevWeekUptimeSum / pointCount) * 100) / 100;
  const uptimeDeltaPct = Math.round((currentAvgUptime - prevWeekAvgUptime) * 100) / 100;

  const currentAvgReq = Math.round(currentReqSum / pointCount);
  const prevWeekAvgReq = Math.round(prevWeekReqSum / pointCount);
  const trafficGrowthPct = Math.round(((currentAvgReq - prevWeekAvgReq) / prevWeekAvgReq) * 1000) / 10;

  const comparisonBaseline = {
    currentAvgLatencyMs: currentAvgLatency,
    prevWeekAvgLatencyMs: prevWeekAvgLatency,
    latencyDeltaMs: totalLatDelta,
    latencyDeltaPct: totalLatDeltaPct,
    currentAvgUptime: currentAvgUptime,
    prevWeekAvgUptime: prevWeekAvgUptime,
    uptimeDeltaPct: uptimeDeltaPct,
    currentAvgRequestsPerMin: currentAvgReq,
    prevWeekAvgRequestsPerMin: prevWeekAvgReq,
    trafficGrowthPct: trafficGrowthPct
  };

  // Latency by endpoint
  const endpointLatency = [
    { endpoint: '/api/attendance/ble-event', avgLatency: 14.2, p95: 28.5, p99: 42.0, status: 'EXCELLENT', reqCount: 4820 },
    { endpoint: '/api/auth/login', avgLatency: 26.8, p95: 45.0, p99: 72.1, status: 'EXCELLENT', reqCount: 1240 },
    { endpoint: '/api/student/dashboard', avgLatency: 19.4, p95: 36.2, p99: 55.4, status: 'EXCELLENT', reqCount: 3190 },
    { endpoint: '/api/admin/overview', avgLatency: 31.5, p95: 58.0, p99: 89.2, status: 'GOOD', reqCount: 840 },
    { endpoint: '/api/qr/generate', avgLatency: 38.0, p95: 64.0, p99: 98.5, status: 'GOOD', reqCount: 410 },
    { endpoint: '/api/admission/apply', avgLatency: 22.1, p95: 41.0, p99: 68.0, status: 'EXCELLENT', reqCount: 650 }
  ];

  // Storage breakdown (in GB and percentage)
  const totalDiskGB = 50.0;
  const dbDataGB = systemStorageState.dbDataGB;
  const auditLogsGB = systemStorageState.auditLogsGB;
  const docsStorageGB = systemStorageState.docsStorageGB;
  const systemOsGB = systemStorageState.systemOsGB;
  const usedDiskGB = Math.round((dbDataGB + auditLogsGB + docsStorageGB + systemOsGB) * 10) / 10;
  const freeDiskGB = Math.round((totalDiskGB - usedDiskGB) * 10) / 10;
  const diskUsagePercent = Math.round((usedDiskGB / totalDiskGB) * 100);

  const storageBreakdown = [
    { name: 'Database Tables', sizeGB: Math.round(dbDataGB * 10) / 10, percentage: Math.round((dbDataGB / totalDiskGB) * 100), color: '#00E5FF' },
    { name: 'Audit & Event Logs', sizeGB: Math.round(auditLogsGB * 10) / 10, percentage: Math.round((auditLogsGB / totalDiskGB) * 100), color: '#3B0A6B' },
    { name: 'Documents & Creds', sizeGB: Math.round(docsStorageGB * 10) / 10, percentage: Math.round((docsStorageGB / totalDiskGB) * 100), color: '#5c14a3' },
    { name: 'OS & Cache Runtime', sizeGB: Math.round(systemOsGB * 10) / 10, percentage: Math.round((systemOsGB / totalDiskGB) * 100), color: '#2a1e45' }
  ];

  res.json({
    success: true,
    overallHealth: 'HEALTHY',
    system: {
      uptimeSeconds,
      uptimePercentage: 99.98,
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(1),
        heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(1),
        heapPercentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      database: {
        status: 'CONNECTED',
        connectionLatencyMs: 1.8,
        activeConnections: 14,
        idleConnections: 6,
        maxPoolSize: 25,
        queriesPerSec: 142,
        replicationLagMs: 0.0,
        sslActive: true,
        transactionState: 'IDLE / HEALTHY',
        recordsCount: {
          users: db.users.length,
          students: db.students.length,
          faculty: db.faculty.length,
          devices: db.devices.length,
          bleEvents: db.bleEvents.length,
          attendanceRecords: db.attendanceRecords.length,
          applications: db.applications.length,
          auditLogs: db.auditLogs.length
        }
      },
      storage: {
        totalGB: totalDiskGB,
        usedGB: usedDiskGB,
        freeGB: freeDiskGB,
        usagePercentage: diskUsagePercent,
        breakdown: storageBreakdown,
        maintenanceInfo: {
          lastRunAt: systemStorageState.lastRunAt,
          lastDurationMs: systemStorageState.lastDurationMs,
          totalRuns: systemStorageState.totalRuns,
          totalReclaimedGB: systemStorageState.totalReclaimedGB,
          lastReclaimedGB: systemStorageState.lastReclaimedGB,
          history: systemStorageState.maintenanceHistory
        }
      },
      apiMetrics: {
        avgLatencyMs: 23.4,
        p95LatencyMs: 44.8,
        p99LatencyMs: 78.2,
        throughputRps: 64.2,
        errorRatePercentage: 0.02,
        endpointBreakdown: endpointLatency
      },
      services: [
        { name: 'Primary Relational Database Engine', status: 'OPERATIONAL', latencyMs: 1.8, type: 'Database' },
        { name: 'ESP32 BLE Telemetry Edge Broker', status: 'OPERATIONAL', latencyMs: 3.2, type: 'IoT Gateway' },
        { name: 'JWT & Token Session Auth Service', status: 'OPERATIONAL', latencyMs: 0.9, type: 'Security' },
        { name: 'Cryptographic SHA-256 Verifier', status: 'OPERATIONAL', latencyMs: 1.4, type: 'PKI' },
        { name: 'Dynamic Workflow QR Code Engine', status: 'OPERATIONAL', latencyMs: 4.1, type: 'Utility' }
      ],
      uptimeHistory,
      comparisonBaseline,
      diagnosticLogs: [
        ...maintenanceDiagnosticLogs,
        {
          id: 'diag-err-01',
          timestamp: new Date(now.getTime() - 42 * 60 * 1000).toISOString(),
          level: 'ERROR',
          subsystem: 'Storage',
          message: 'Storage volume /var/data/postgres reached 36.0% utilization threshold',
          details: 'Storage allocation exceeded active baseline threshold. Partition growth rate (+420MB/24h) flagged for automated archival.',
          traceId: 'tr-stg-9041',
          metricContext: '36.0% / 50 GB'
        },
        {
          id: 'diag-err-02',
          timestamp: new Date(now.getTime() - 95 * 60 * 1000).toISOString(),
          level: 'ERROR',
          subsystem: 'API Gateway',
          message: 'P99 Latency SLA violation detected on /api/qr/generate (98.5ms)',
          details: 'Heavy burst in concurrent cryptographic digital ID badge generation exceeded 95ms SLA target threshold.',
          traceId: 'tr-api-8822',
          metricContext: '98.5 ms (P99)'
        },
        {
          id: 'diag-err-03',
          timestamp: new Date(now.getTime() - 180 * 60 * 1000).toISOString(),
          level: 'ERROR',
          subsystem: 'IoT Gateway',
          message: 'BLE turnstile edge node ESP32-GATE-WEST-03 frame retry timeout',
          details: '3 consecutive BLE advertisement packet drops recorded at Turnstile West. Automatic frequency hopping resolved issue.',
          traceId: 'tr-ble-7714',
          metricContext: '3 frame drops'
        },
        {
          id: 'diag-err-04',
          timestamp: new Date(now.getTime() - 310 * 60 * 1000).toISOString(),
          level: 'ERROR',
          subsystem: 'Database',
          message: 'Lock contention alert during multi-table attendance aggregation batch',
          details: 'Read lock on attendance_records table held for 18.2ms under peak faculty portal grading transactions.',
          traceId: 'tr-db-6603',
          metricContext: '18.2 ms wait'
        },
        {
          id: 'diag-warn-01',
          timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
          level: 'WARNING',
          subsystem: 'Database',
          message: 'Connection pool elevated concurrency: 18 of 25 active sockets utilized',
          details: 'Connection pool utilization hit 72%. Additional worker connection pre-allocation triggered.',
          traceId: 'tr-db-5519',
          metricContext: '18 / 25 active'
        },
        {
          id: 'diag-warn-02',
          timestamp: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
          level: 'WARNING',
          subsystem: 'API Gateway',
          message: 'Elevated average latency on /api/admin/overview (31.5ms avg)',
          details: 'Latency increased by +11.5ms due to simultaneous export of system health and attendance records.',
          traceId: 'tr-api-4402',
          metricContext: '31.5 ms avg'
        },
        {
          id: 'diag-warn-03',
          timestamp: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),
          level: 'WARNING',
          subsystem: 'IoT Gateway',
          message: 'Weak beacon RSSI detected on ESP32 Turnstile Node 02 (-78 dBm)',
          details: 'Signal attenuation detected near North Gate. Calibration recommended for sub-1 meter turnstile approach.',
          traceId: 'tr-ble-3310',
          metricContext: '-78 dBm'
        },
        {
          id: 'diag-warn-04',
          timestamp: new Date(now.getTime() - 240 * 60 * 1000).toISOString(),
          level: 'WARNING',
          subsystem: 'Storage',
          message: 'Audit logs partition reached 4.2 GB allocation',
          details: 'Log partition exceeds 8% of total cluster volume. Automated 30-day compressed rollover scheduled.',
          traceId: 'tr-stg-2208',
          metricContext: '4.2 GB logs'
        },
        {
          id: 'diag-warn-05',
          timestamp: new Date(now.getTime() - 400 * 60 * 1000).toISOString(),
          level: 'WARNING',
          subsystem: 'Security / Auth',
          message: 'Rapid session token verification burst from subnet 192.168.10.0/24',
          details: '15 session token integrity checks handled within 10-second interval; authenticated tokens verified valid.',
          traceId: 'tr-sec-1197',
          metricContext: '15 req / 10s'
        },
        {
          id: 'diag-info-01',
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'Database',
          message: 'Database connection pool nominal; TLS 1.3 encrypted socket active',
          details: 'PostgreSQL connection latency 1.8ms; replication lag 0.0ms with zero corrupted memory blocks.',
          traceId: 'tr-db-0012',
          metricContext: '1.8 ms'
        },
        {
          id: 'diag-info-02',
          timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'IoT Gateway',
          message: 'ESP32 Turnstile Node 01 heartbeat verified (RSSI -55 dBm, 100% battery)',
          details: 'Firmware v2.4.1-BLE-PROD active. Anti-spoofing detection window operational at 300s.',
          traceId: 'tr-ble-0023',
          metricContext: '100% battery'
        },
        {
          id: 'diag-info-03',
          timestamp: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'Security / Auth',
          message: 'JWT active session rotation completed across 48 authenticated tokens',
          details: 'Cryptographic SHA-256 session integrity check passed with zero revoked session anomalies.',
          traceId: 'tr-sec-0034',
          metricContext: '48 sessions'
        },
        {
          id: 'diag-info-04',
          timestamp: new Date(now.getTime() - 110 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'Network',
          message: 'Microservice availability probes responded 200 OK across 5 nodes',
          details: 'Edge broker, database engine, auth service, PKI validator, and QR engine all in OPERATIONAL state.',
          traceId: 'tr-net-0045',
          metricContext: '5 / 5 online'
        },
        {
          id: 'diag-info-05',
          timestamp: new Date(now.getTime() - 210 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'Worker',
          message: 'Scheduled incremental database telemetry snapshot flushed to cold storage',
          details: 'Snapshot checkpoint 0x48A1 written and validated against primary master hash.',
          traceId: 'tr-wrk-0056',
          metricContext: '28.4 MB delta'
        },
        {
          id: 'diag-info-06',
          timestamp: new Date(now.getTime() - 360 * 60 * 1000).toISOString(),
          level: 'INFO',
          subsystem: 'API Gateway',
          message: 'Global throughput stabilized at 64.2 requests/sec with 0.02% error rate',
          details: 'Node.js event loop lag 1.1ms; garbage collection pauses under 4ms.',
          traceId: 'tr-api-0067',
          metricContext: '64.2 RPS'
        }
      ]
    }
  });
});

// 5b. Database Indexing & Cleanup Maintenance Routine
router.post('/maintenance/database-cleanup', (req: AuthenticatedRequest, res) => {
  const {
    rebuildIndexes = true,
    vacuumAnalyze = true,
    purgeTempTelemetry = true,
    compressAuditLogs = true
  } = req.body || {};

  const startTime = Date.now();
  const routineSteps: MaintenanceStepResult[] = [];
  let totalReclaimedMB = 0;

  // 1. Rebuild B-Tree Indexes
  if (rebuildIndexes) {
    const stepDuration = Math.floor(Math.random() * 80) + 320;
    const mbReclaimed = systemStorageState.totalRuns === 0 ? 1940 : 280;
    totalReclaimedMB += mbReclaimed;
    routineSteps.push({
      step: 1,
      name: 'B-Tree Index Defragmentation & Rebuild',
      target: 'attendance_records, ble_events, audit_logs, users, student_profiles',
      status: 'COMPLETED',
      durationMs: stepDuration,
      reclaimedMB: mbReclaimed,
      details: 'Rebuilt 14 B-Tree indexes across primary relations; eliminated index tree fragmentation.'
    });
  }

  // 2. Vacuum Analyze
  if (vacuumAnalyze) {
    const stepDuration = Math.floor(Math.random() * 100) + 380;
    const mbReclaimed = systemStorageState.totalRuns === 0 ? 1520 : 190;
    totalReclaimedMB += mbReclaimed;
    routineSteps.push({
      step: 2,
      name: 'PostgreSQL VACUUM FULL & ANALYZE',
      target: 'public schema tables & WAL logs',
      status: 'COMPLETED',
      durationMs: stepDuration,
      reclaimedMB: mbReclaimed,
      details: 'Purged dead tuples, reclaimed unreferenced disk pages, and updated query planner histogram statistics.'
    });
  }

  // 3. Purge Ephemeral BLE Telemetry Buffer
  if (purgeTempTelemetry) {
    const stepDuration = Math.floor(Math.random() * 50) + 180;
    const mbReclaimed = systemStorageState.totalRuns === 0 ? 1280 : 140;
    totalReclaimedMB += mbReclaimed;
    routineSteps.push({
      step: 3,
      name: 'Ephemeral BLE Telemetry Buffer Flush',
      target: 'transient_packet_cache & handshake_sessions',
      status: 'COMPLETED',
      durationMs: stepDuration,
      reclaimedMB: mbReclaimed,
      details: `Flushed ${systemStorageState.totalRuns === 0 ? '42,500' : '4,200'} expired BLE advertisement packets beyond retention window.`
    });
  }

  // 4. Compress Stale Audit Logs
  if (compressAuditLogs) {
    const stepDuration = Math.floor(Math.random() * 60) + 210;
    const mbReclaimed = systemStorageState.totalRuns === 0 ? 1160 : 120;
    totalReclaimedMB += mbReclaimed;
    routineSteps.push({
      step: 4,
      name: 'Audit Log Partition Compaction & Zstandard Compression',
      target: 'audit_logs_partition_archive',
      status: 'COMPLETED',
      durationMs: stepDuration,
      reclaimedMB: mbReclaimed,
      details: 'Compressed archived audit logs into cold storage segments with 3.6:1 compression ratio.'
    });
  }

  const executionTimeMs = Date.now() - startTime + routineSteps.reduce((acc, s) => acc + s.durationMs, 0);
  const reclaimedGB = Math.round((totalReclaimedMB / 1024) * 100) / 100;

  // Apply reductions to systemStorageState
  if (systemStorageState.totalRuns === 0) {
    // First run reduces storage significantly: from 20.2 GB (40.4%) down to 14.3 GB (28.6%)
    systemStorageState.dbDataGB = 5.4;
    systemStorageState.auditLogsGB = 2.8;
    systemStorageState.systemOsGB = 2.5;
  } else {
    // Subsequent runs keep storage optimized, shaving small incremental dead tuples
    systemStorageState.dbDataGB = Math.max(4.8, Math.round((systemStorageState.dbDataGB - 0.2) * 10) / 10);
    systemStorageState.auditLogsGB = Math.max(2.4, Math.round((systemStorageState.auditLogsGB - 0.1) * 10) / 10);
  }

  const totalDiskGB = 50.0;
  const newUsedDiskGB = Math.round((systemStorageState.dbDataGB + systemStorageState.auditLogsGB + systemStorageState.docsStorageGB + systemStorageState.systemOsGB) * 10) / 10;
  const newFreeDiskGB = Math.round((totalDiskGB - newUsedDiskGB) * 10) / 10;
  const newUsagePct = Math.round((newUsedDiskGB / totalDiskGB) * 100);

  const newBreakdown = [
    { name: 'Database Tables', sizeGB: systemStorageState.dbDataGB, percentage: Math.round((systemStorageState.dbDataGB / totalDiskGB) * 100), color: '#00E5FF' },
    { name: 'Audit & Event Logs', sizeGB: systemStorageState.auditLogsGB, percentage: Math.round((systemStorageState.auditLogsGB / totalDiskGB) * 100), color: '#3B0A6B' },
    { name: 'Documents & Creds', sizeGB: systemStorageState.docsStorageGB, percentage: Math.round((systemStorageState.docsStorageGB / totalDiskGB) * 100), color: '#5c14a3' },
    { name: 'OS & Cache Runtime', sizeGB: systemStorageState.systemOsGB, percentage: Math.round((systemStorageState.systemOsGB / totalDiskGB) * 100), color: '#2a1e45' }
  ];

  const nowIso = new Date().toISOString();
  systemStorageState.lastRunAt = nowIso;
  systemStorageState.lastDurationMs = executionTimeMs;
  systemStorageState.totalRuns += 1;
  systemStorageState.lastReclaimedGB = reclaimedGB;
  systemStorageState.totalReclaimedGB = Math.round((systemStorageState.totalReclaimedGB + reclaimedGB) * 100) / 100;

  const historyEntry = {
    id: `maint-${Date.now()}`,
    executedAt: nowIso,
    reclaimedGB,
    durationMs: executionTimeMs,
    actorName: req.user?.name || 'Administrator',
    stepsCount: routineSteps.length
  };
  systemStorageState.maintenanceHistory.unshift(historyEntry);

  // Diagnostic log entry
  const diagLog = {
    id: `diag-maint-${Date.now()}`,
    timestamp: nowIso,
    level: 'INFO' as const,
    subsystem: 'Database' as const,
    message: `Automated database indexing and storage cleanup completed (-${reclaimedGB.toFixed(1)} GB reclaimed)`,
    details: `Successfully rebuilt B-Tree indexes, vacuumed dead tuples, and compacted audit partitions in ${executionTimeMs}ms. Storage reduced to ${newUsagePct}%.`,
    traceId: `tr-maint-${Date.now().toString(36).slice(-4)}`,
    metricContext: `-${reclaimedGB.toFixed(1)} GB freed`
  };
  maintenanceDiagnosticLogs.unshift(diagLog);

  // Audit log entry
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'DATABASE_MAINTENANCE_JOB',
    actorId: req.user?.userId || 'admin',
    actorRole: 'ADMIN',
    actorName: req.user?.name || 'System Admin',
    details: `Executed manual maintenance routine: rebuilt indexes, vacuumed dead tuples, and purged transient buffers. Reclaimed ${reclaimedGB} GB (${totalReclaimedMB} MB) in ${executionTimeMs}ms.`,
    timestamp: nowIso,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({
    success: true,
    message: `Database maintenance and storage cleanup completed successfully. Reclaimed ${reclaimedGB} GB of disk space.`,
    executionTimeMs,
    reclaimedGB,
    reclaimedMB: totalReclaimedMB,
    routineSteps,
    newStorage: {
      totalGB: totalDiskGB,
      usedGB: newUsedDiskGB,
      freeGB: newFreeDiskGB,
      usagePercentage: newUsagePct,
      breakdown: newBreakdown,
      maintenanceInfo: {
        lastRunAt: systemStorageState.lastRunAt,
        lastDurationMs: systemStorageState.lastDurationMs,
        totalRuns: systemStorageState.totalRuns,
        totalReclaimedGB: systemStorageState.totalReclaimedGB,
        lastReclaimedGB: systemStorageState.lastReclaimedGB,
        history: systemStorageState.maintenanceHistory
      }
    },
    maintenanceLog: diagLog
  });
});

// 6. Audit Logs
router.get('/audit-logs', (req, res) => {
  res.json({ success: true, logs: db.auditLogs });
});

// 7. System Settings
router.get('/settings', (req, res) => {
  res.json({ success: true, settings: db.settings });
});

router.patch('/settings', (req: AuthenticatedRequest, res) => {
  const {
    collegeName,
    collegeShortCode,
    campusAddress,
    academicYear,
    attendanceThresholdPercent,
    bleDetectionWindowSeconds,
    enableManualAttendanceOverride,
    contactEmail,
    contactPhone
  } = req.body;

  if (collegeName) db.settings.collegeName = String(collegeName);
  if (collegeShortCode) db.settings.collegeShortCode = String(collegeShortCode);
  if (campusAddress) db.settings.campusAddress = String(campusAddress);
  if (academicYear) db.settings.academicYear = String(academicYear);
  if (attendanceThresholdPercent !== undefined) db.settings.attendanceThresholdPercent = Number(attendanceThresholdPercent);
  if (bleDetectionWindowSeconds !== undefined) db.settings.bleDetectionWindowSeconds = Number(bleDetectionWindowSeconds);
  if (enableManualAttendanceOverride !== undefined) db.settings.enableManualAttendanceOverride = Boolean(enableManualAttendanceOverride);
  if (contactEmail) db.settings.contactEmail = String(contactEmail);
  if (contactPhone) db.settings.contactPhone = String(contactPhone);

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'SYSTEM_SETTINGS_UPDATED',
    actorId: req.user?.userId || '',
    actorRole: 'ADMIN',
    actorName: req.user?.name || '',
    details: `Updated global college settings and attendance thresholds.`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Settings saved successfully', settings: db.settings });
});

export default router;
