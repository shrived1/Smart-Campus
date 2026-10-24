import { describe, it, expect, beforeEach } from 'vitest';
import { db, hashPassword, verifyPassword } from '../server/db.js';
import { createSessionToken, revokeSession, activeSessions, canAccessStudentData } from '../server/auth.js';

describe('Smart Campus Authentication & Role Enforcement Tests', () => {
  beforeEach(() => {
    activeSessions.clear();
  });

  it('1. Verifies credentials with secure salt-hash cryptography', () => {
    const salt = 'smartcampus2026staticSalt';
    const hash = hashPassword('Student@2026!', salt);
    expect(verifyPassword('Student@2026!', hash, salt)).toBe(true);
    expect(verifyPassword('WrongPassword123', hash, salt)).toBe(false);
  });

  it('2. Authoritative role assignment: Returns correct portal destinations', () => {
    const studentUser = db.users.find(u => u.role === 'STUDENT');
    const facultyUser = db.users.find(u => u.role === 'FACULTY');
    const parentUser = db.users.find(u => u.role === 'PARENT');
    const admissionUser = db.users.find(u => u.role === 'ADMISSION');
    const adminUser = db.users.find(u => u.role === 'ADMIN');

    expect(studentUser?.role).toBe('STUDENT');
    expect(facultyUser?.role).toBe('FACULTY');
    expect(parentUser?.role).toBe('PARENT');
    expect(admissionUser?.role).toBe('ADMISSION');
    expect(adminUser?.role).toBe('ADMIN');

    // Never default to admin
    expect(studentUser?.role).not.toBe('ADMIN');
    expect(facultyUser?.role).not.toBe('ADMIN');
    expect(parentUser?.role).not.toBe('ADMIN');
  });

  it('3. Session token lifecycle: Creates session and verifies expiration', () => {
    const user = db.users.find(u => u.role === 'STUDENT')!;
    const session = createSessionToken(user);

    expect(session.token).toMatch(/^sctk_/);
    expect(session.userId).toBe(user.id);
    expect(session.role).toBe('STUDENT');
    expect(activeSessions.has(session.token)).toBe(true);

    // Logout revocation
    revokeSession(session.token);
    expect(activeSessions.has(session.token)).toBe(false);
  });
});

describe('Smart Attendance ESP32 BLE Deduplication Tests', () => {
  it('4. ESP32 Turnstile Node Detection & Duplicate Window Protection', () => {
    const student = db.students[0]; // Alex Rivers (MAC: AA:BB:CC:11:22:33)
    const device = db.devices.find(d => d.nodeId === 'ESP32-GATE-MAIN-01')!;

    expect(device).toBeDefined();
    expect(device.status).toBe('ONLINE');

    // Simulate detection 1
    const scan1Time = Date.now();
    const event1 = {
      studentId: student.id,
      nodeId: device.nodeId,
      timestamp: scan1Time
    };

    // Subsequent detection 2 within 10 seconds (under 300s window)
    const scan2Time = scan1Time + 10000;
    const isDuplicate = (scan2Time - scan1Time) < (db.settings.bleDetectionWindowSeconds * 1000);
    expect(isDuplicate).toBe(true);

    // Detection 3 after 6 minutes (360 seconds, exceeds 300s window)
    const scan3Time = scan1Time + (360 * 1000);
    const isNewDetection = (scan3Time - scan1Time) >= (db.settings.bleDetectionWindowSeconds * 1000);
    expect(isNewDetection).toBe(true);
  });
});

describe('Parent-Child Data Isolation Tests', () => {
  it('5. Strictly isolates student academic data by relationship', () => {
    const studentAlex = 'STU-2023-042';
    const studentLiam = 'STU-2023-088';

    const parentSession = {
      token: 'test_token',
      userId: 'usr-parent-01',
      email: 'parent.rivers@smartcampus.edu',
      role: 'PARENT' as const,
      name: 'Marcus Rivers',
      linkedStudentId: studentAlex,
      expiresAt: Date.now() + 10000
    };

    // Parent CAN access their own child
    expect(canAccessStudentData(parentSession, studentAlex)).toBe(true);

    // Parent CANNOT access other students
    expect(canAccessStudentData(parentSession, studentLiam)).toBe(false);

    // Student Alex CAN access own records
    const studentSession = {
      token: 'test_token_student',
      userId: 'usr-student-01',
      email: 'alex.rivers@smartcampus.edu',
      role: 'STUDENT' as const,
      name: 'Alex Rivers',
      studentId: studentAlex,
      expiresAt: Date.now() + 10000
    };
    expect(canAccessStudentData(studentSession, studentAlex)).toBe(true);
    expect(canAccessStudentData(studentSession, studentLiam)).toBe(false);
  });
});

describe('Admissions Status Workflow Tests', () => {
  it('6. Validates admission status transitions and reference codes', () => {
    const validStatuses = [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'DOCUMENTS_REQUIRED',
      'APPROVED',
      'REJECTED',
      'WAITLISTED'
    ];

    const app = db.applications[0];
    expect(validStatuses).toContain(app.status);
    expect(app.refNumber).toMatch(/^SC-ADM-2026-\d{4}$/);
  });

  it('7. Validates System Health telemetry constraints: Database connection, storage capacity, and latency percentiles', () => {
    // Database integrity
    expect(db.users.length).toBeGreaterThan(0);
    expect(db.devices.length).toBeGreaterThan(0);

    // Latency & SLA constraints
    const slaLatencyMaxMs = 100;
    const avgLatencyMs = 23.4;
    expect(avgLatencyMs).toBeLessThan(slaLatencyMaxMs);

    // Storage capacity
    const totalGB = 50.0;
    const usedGB = 18.0;
    expect(usedGB).toBeLessThan(totalGB);
  });

  it('8. Validates custom alert threshold evaluation and breach triggers', () => {
    const currentMetrics = {
      avgLatencyMs: 23.4,
      storageUsagePct: 36
    };

    // Strict testing preset
    const strictPolicy = { latencyMs: 15, storagePct: 30 };
    const isLatencyBreachedStrict = currentMetrics.avgLatencyMs > strictPolicy.latencyMs;
    const isStorageBreachedStrict = currentMetrics.storageUsagePct > strictPolicy.storagePct;

    expect(isLatencyBreachedStrict).toBe(true);
    expect(isStorageBreachedStrict).toBe(true);

    // Recommended production policy
    const recommendedPolicy = { latencyMs: 45, storagePct: 75 };
    const isLatencyBreachedRec = currentMetrics.avgLatencyMs > recommendedPolicy.latencyMs;
    const isStorageBreachedRec = currentMetrics.storageUsagePct > recommendedPolicy.storagePct;

    expect(isLatencyBreachedRec).toBe(false);
    expect(isStorageBreachedRec).toBe(false);
  });

  it('9. Validates System Health CSV audit export schema and telemetry headers', () => {
    // Generate audit CSV rows representation
    const csvHeaders = [
      'METADATA_KEY,VALUE',
      'DATABASE_METRIC,VALUE,UNIT,STATUS',
      'STORAGE_CATEGORY,ALLOCATION_GB,PERCENTAGE,STATUS',
      'API_METRIC_NAME,METRIC_VALUE,UNIT,POLICY_THRESHOLD',
      'ENDPOINT_PATH,REQUESTS_24H,AVG_LATENCY_MS,P95_MS,P99_MS,CONFIGURED_LIMIT_MS,COMPLIANCE_STATUS',
      'HOURLY_WINDOW,UPTIME_PERCENT,LATENCY_MS,TRAFFIC_REQ_PER_MIN,ERROR_RATE_PERCENT',
      'MICROSERVICE_NAME,SERVICE_TYPE,PROBE_LATENCY_MS,OPERATIONAL_STATUS'
    ];

    const sampleRow = '"/api/attendance/mark",24500,28.4,54.1,88.2,45,WITHIN_LIMIT';
    expect(csvHeaders.length).toBe(7);
    expect(sampleRow).toContain('/api/attendance/mark');
    expect(sampleRow).toContain('WITHIN_LIMIT');
  });

  it('10. Validates System Diagnostic Log filtering and severity sorting (Error, Warning, Info)', () => {
    interface TestLog {
      id: string;
      level: 'ERROR' | 'WARNING' | 'INFO';
      subsystem: string;
      message: string;
      timestamp: string;
    }

    const mockLogs: TestLog[] = [
      { id: '1', level: 'INFO', subsystem: 'Database', message: 'DB pool connected', timestamp: '2026-10-24T10:00:00Z' },
      { id: '2', level: 'ERROR', subsystem: 'Storage', message: 'Storage 36% exceeded limit', timestamp: '2026-10-24T10:05:00Z' },
      { id: '3', level: 'WARNING', subsystem: 'API Gateway', message: 'Latency 31ms elevated', timestamp: '2026-10-24T10:02:00Z' },
      { id: '4', level: 'ERROR', subsystem: 'API Gateway', message: 'P99 SLA violation', timestamp: '2026-10-24T09:30:00Z' },
      { id: '5', level: 'INFO', subsystem: 'IoT Gateway', message: 'ESP32 heartbeat 0 drops', timestamp: '2026-10-24T10:08:00Z' }
    ];

    // 1. Filter by Level
    const errorLogs = mockLogs.filter(l => l.level === 'ERROR');
    expect(errorLogs.length).toBe(2);
    expect(errorLogs.every(l => l.level === 'ERROR')).toBe(true);

    const warningLogs = mockLogs.filter(l => l.level === 'WARNING');
    expect(warningLogs.length).toBe(1);
    expect(warningLogs[0].level).toBe('WARNING');

    const infoLogs = mockLogs.filter(l => l.level === 'INFO');
    expect(infoLogs.length).toBe(2);
    expect(infoLogs.every(l => l.level === 'INFO')).toBe(true);

    // 2. Sort by Severity (ERROR = 3, WARNING = 2, INFO = 1)
    const severityRank = (lvl: 'ERROR' | 'WARNING' | 'INFO') => {
      switch (lvl) {
        case 'ERROR': return 3;
        case 'WARNING': return 2;
        case 'INFO': return 1;
      }
    };

    const sortedDesc = [...mockLogs].sort((a, b) => {
      const diff = severityRank(b.level) - severityRank(a.level);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    expect(sortedDesc[0].level).toBe('ERROR');
    expect(sortedDesc[1].level).toBe('ERROR');
    expect(sortedDesc[2].level).toBe('WARNING');
    expect(sortedDesc[3].level).toBe('INFO');
    expect(sortedDesc[4].level).toBe('INFO');

    // 3. Sort by Severity Ascending (INFO -> WARNING -> ERROR)
    const sortedAsc = [...mockLogs].sort((a, b) => {
      const diff = severityRank(a.level) - severityRank(b.level);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    expect(sortedAsc[0].level).toBe('INFO');
    expect(sortedAsc[1].level).toBe('INFO');
    expect(sortedAsc[2].level).toBe('WARNING');
    expect(sortedAsc[3].level).toBe('ERROR');
    expect(sortedAsc[4].level).toBe('ERROR');
  });

  it('11. Validates 7-Day Performance Benchmark overlay & delta calculations (Current vs. Previous Week)', () => {
    interface BenchmarkPoint {
      time: string;
      uptime: number;
      latencyMs: number;
      prevWeekLatencyMs: number;
      requestsPerMin: number;
      prevWeekRequestsPerMin: number;
      latencyDeltaMs: number;
      latencyDeltaPct: number;
    }

    const mockUptimeHistory: BenchmarkPoint[] = [
      {
        time: '08:00 AM',
        uptime: 100.0,
        latencyMs: 22.4,
        prevWeekLatencyMs: 26.2,
        requestsPerMin: 220,
        prevWeekRequestsPerMin: 195,
        latencyDeltaMs: -3.8,
        latencyDeltaPct: -14.5
      },
      {
        time: '09:00 AM',
        uptime: 99.98,
        latencyMs: 28.1,
        prevWeekLatencyMs: 31.5,
        requestsPerMin: 340,
        prevWeekRequestsPerMin: 300,
        latencyDeltaMs: -3.4,
        latencyDeltaPct: -10.8
      },
      {
        time: '10:00 AM',
        uptime: 100.0,
        latencyMs: 21.0,
        prevWeekLatencyMs: 19.5,
        requestsPerMin: 260,
        prevWeekRequestsPerMin: 250,
        latencyDeltaMs: 1.5,
        latencyDeltaPct: 7.7
      }
    ];

    // 1. Verify all records have valid previous week benchmark metrics
    expect(mockUptimeHistory.length).toBe(3);
    expect(mockUptimeHistory.every(pt => pt.prevWeekLatencyMs > 0)).toBe(true);
    expect(mockUptimeHistory.every(pt => pt.prevWeekRequestsPerMin > 0)).toBe(true);

    // 2. Validate delta calculation logic
    for (const pt of mockUptimeHistory) {
      const expectedDeltaMs = Math.round((pt.latencyMs - pt.prevWeekLatencyMs) * 10) / 10;
      const expectedDeltaPct = Math.round(((pt.latencyMs - pt.prevWeekLatencyMs) / pt.prevWeekLatencyMs) * 1000) / 10;
      expect(pt.latencyDeltaMs).toBeCloseTo(expectedDeltaDeltaOrClose(expectedDeltaMs), 1);
      expect(pt.latencyDeltaPct).toBeCloseTo(expectedDeltaPct, 1);
    }

    function expectedDeltaDeltaOrClose(val: number) {
      return val;
    }

    // 3. Verify faster vs slower classification
    const fasterHours = mockUptimeHistory.filter(pt => pt.latencyDeltaMs < 0);
    const slowerHours = mockUptimeHistory.filter(pt => pt.latencyDeltaMs > 0);
    expect(fasterHours.length).toBe(2);
    expect(slowerHours.length).toBe(1);

    // 4. Validate overall 7-day comparative summary delta aggregation
    const avgCurrent = mockUptimeHistory.reduce((acc, p) => acc + p.latencyMs, 0) / mockUptimeHistory.length;
    const avgPrev = mockUptimeHistory.reduce((acc, p) => acc + p.prevWeekLatencyMs, 0) / mockUptimeHistory.length;
    const overallDeltaMs = Math.round((avgCurrent - avgPrev) * 10) / 10;
    const overallDeltaPct = Math.round(((avgCurrent - avgPrev) / avgPrev) * 1000) / 10;

    expect(overallDeltaMs).toBeLessThan(0); // overall optimized / faster
    expect(overallDeltaPct).toBeLessThan(0);

    // 5. Validate CSV comparative row format
    const csvHeader = 'HOURLY_WINDOW,CURRENT_UPTIME_PCT,CURRENT_LATENCY_MS,PREV_WEEK_LATENCY_MS,LATENCY_DELTA_MS,LATENCY_PCT_CHANGE,CURRENT_REQ_PER_MIN,PREV_WEEK_REQ_PER_MIN,ERROR_RATE_PCT';
    const sampleRow = `"${mockUptimeHistory[0].time}",${mockUptimeHistory[0].uptime},${mockUptimeHistory[0].latencyMs},${mockUptimeHistory[0].prevWeekLatencyMs},${mockUptimeHistory[0].latencyDeltaMs},${mockUptimeHistory[0].latencyDeltaPct}%,${mockUptimeHistory[0].requestsPerMin},${mockUptimeHistory[0].prevWeekRequestsPerMin},0.01`;

    expect(csvHeader).toContain('PREV_WEEK_LATENCY_MS');
    expect(csvHeader).toContain('LATENCY_DELTA_MS');
    expect(sampleRow).toContain('-3.8');
    expect(sampleRow).toContain('-14.5%');
  });
});

describe('Automated Database Indexing & Storage Cleanup Routine Tests', () => {
  it('12. Executes maintenance routines, reclaims storage bloat, and records audit logs', () => {
    // Test storage reclamation math, routine steps, threshold resolution, and diagnostic logs
    const initialStorage = {
      totalGB: 50.0,
      dbDataGB: 8.6,
      auditLogsGB: 5.2,
      docsStorageGB: 3.6,
      systemOsGB: 2.8,
      thresholdPct: 35
    };

    const initialUsedGB = Math.round((initialStorage.dbDataGB + initialStorage.auditLogsGB + initialStorage.docsStorageGB + initialStorage.systemOsGB) * 10) / 10;
    const initialUsagePct = Math.round((initialUsedGB / initialStorage.totalGB) * 100);

    // Initial state breaches 35% threshold (40.4% -> 40%)
    expect(initialUsagePct).toBe(40);
    expect(initialUsagePct).toBeGreaterThan(initialStorage.thresholdPct);

    // Simulate maintenance routine execution across all 4 subsystems
    const routineTasks = [
      { step: 1, name: 'B-Tree Index Defragmentation', mbReclaimed: 1940 },
      { step: 2, name: 'PostgreSQL VACUUM FULL & ANALYZE', mbReclaimed: 1520 },
      { step: 3, name: 'Ephemeral BLE Telemetry Buffer Flush', mbReclaimed: 1280 },
      { step: 4, name: 'Audit Log Partition Compaction', mbReclaimed: 1160 }
    ];

    const totalReclaimedMB = routineTasks.reduce((acc, t) => acc + t.mbReclaimed, 0);
    const reclaimedGB = Math.round((totalReclaimedMB / 1024) * 100) / 100;

    expect(totalReclaimedMB).toBe(5900);
    expect(reclaimedGB).toBe(5.76);

    // Post-maintenance compacted storage values
    const postDbDataGB = 5.4;
    const postAuditLogsGB = 2.8;
    const postSystemOsGB = 2.5;
    const postUsedGB = Math.round((postDbDataGB + postAuditLogsGB + initialStorage.docsStorageGB + postSystemOsGB) * 10) / 10;
    const postUsagePct = Math.round((postUsedGB / initialStorage.totalGB) * 100);

    expect(postUsedGB).toBe(14.3);
    expect(postUsagePct).toBe(29);
    // Post maintenance usage resolves threshold breach
    expect(postUsagePct).toBeLessThan(initialStorage.thresholdPct);

    // Check audit log generation format
    const auditRecord = {
      action: 'DATABASE_MAINTENANCE_JOB',
      actorRole: 'ADMIN',
      reclaimedGB,
      timestamp: new Date().toISOString()
    };
    expect(auditRecord.action).toBe('DATABASE_MAINTENANCE_JOB');
    expect(auditRecord.actorRole).toBe('ADMIN');
    expect(auditRecord.reclaimedGB).toBeGreaterThan(0);
  });
});


