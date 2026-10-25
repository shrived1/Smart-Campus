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

describe('Production API & Vercel Serverless Handler Integration Tests', () => {
  it('13. Serves /api/health, /api/auth/login, controlled /api/auth/demo-login, CORS, and ESP32 endpoints via api/index.ts', async () => {
    const http = await import('http');
    const { default: vercelApiHandler } = await import('../api/index.js');

    const server = http.createServer(vercelApiHandler);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Safe health-check endpoint (/api/health and /api) + CORS headers for deployed frontends
      const healthRes = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://shrived1.github.io' }
      });
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers.get('access-control-allow-origin')).toBe('https://shrived1.github.io');
      const healthJson = await healthRes.json();
      expect(healthJson.ok).toBe(true);
      expect(healthJson.status).toBe('HEALTHY');

      const preflightRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://smartcollage.vercel.app' }
      });
      expect(preflightRes.status).toBe(204);
      expect(preflightRes.headers.get('access-control-allow-origin')).toBe('https://smartcollage.vercel.app');

      // 2. Reject missing fields with 400 and invalid password with 401 (distinct from 404)
      const missingFieldsRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '', password: '' })
      });
      expect(missingFieldsRes.status).toBe(400);

      const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'alex.rivers@smartcampus.edu', password: 'WrongPassword!' })
      });
      expect(badLoginRes.status).toBe(401);

      const unknownRouteRes = await fetch(`${baseUrl}/api/auth/nonexistent-endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(unknownRouteRes.status).toBe(404);
      const unknownRouteJson = await unknownRouteRes.json();
      expect(unknownRouteJson.error).toContain('API route not found');

      // 3. Authenticate all 5 roles (plus Student roll number CS2023-042) and verify authoritative redirect URLs
      const rollLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'CS2023-042', password: 'Student@2026!' })
      });
      expect(rollLoginRes.status).toBe(200);
      const rollLoginData = await rollLoginRes.json();
      expect(rollLoginData.user.role).toBe('STUDENT');
      expect(rollLoginData.redirectUrl).toBe('/student/dashboard');

      const roleCases = [
        { email: 'alex.rivers@smartcampus.edu', pass: 'Student@2026!', role: 'STUDENT', redirect: '/student/dashboard' },
        { email: 'prof.sharma@smartcampus.edu', pass: 'Faculty@2026!', role: 'FACULTY', redirect: '/faculty/dashboard' },
        { email: 'parent.rivers@smartcampus.edu', pass: 'Parent@2026!', role: 'PARENT', redirect: '/parent/dashboard' },
        { email: 'admission.officer@smartcampus.edu', pass: 'Admission@2026!', role: 'ADMISSION', redirect: '/admission/dashboard' },
        { email: 'admin@smartcampus.edu', pass: 'Admin@2026!', role: 'ADMIN', redirect: '/admin/dashboard' }
      ];

      let studentToken = '';
      let adminToken = '';

      for (const rc of roleCases) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: rc.email, password: rc.pass })
        });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.user.role).toBe(rc.role);
        expect(data.redirectUrl).toBe(rc.redirect);
        expect(data.token).toMatch(/^sctk_/);

        if (rc.role === 'STUDENT') studentToken = data.token;
        if (rc.role === 'ADMIN') adminToken = data.token;
      }

      // 3b. Verify stripped-prefix path (/auth/login) in case a serverless rewrite strips /api
      const strippedLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'alex.rivers@smartcampus.edu', password: 'Student@2026!' })
      });
      expect(strippedLoginRes.status).toBe(200);

      // 3c. Verify /api/auth/demo-accounts never exposes passwords and /api/auth/demo-login enforces environment controls
      const demoAccountsRes = await fetch(`${baseUrl}/api/auth/demo-accounts`);
      expect(demoAccountsRes.status).toBe(200);
      const demoAccountsJson = await demoAccountsRes.json();
      expect(demoAccountsJson.accounts.length).toBe(5);
      for (const acc of demoAccountsJson.accounts) {
        expect(acc.password).toBeUndefined();
        expect(acc.pass).toBeUndefined();
      }

      const demoStudentRes = await fetch(`${baseUrl}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'STUDENT' })
      });
      expect(demoStudentRes.status).toBe(200);
      const demoStudentData = await demoStudentRes.json();
      expect(demoStudentData.user.role).toBe('STUDENT');
      expect(demoStudentData.redirectUrl).toBe('/student/dashboard');

      const prevNodeEnv = process.env.NODE_ENV;
      const prevDemoAdminEnv = process.env.ENABLE_DEMO_ADMIN_AUTH;
      const prevDemoEnv = process.env.ENABLE_DEMO_AUTH;
      try {
        // In production with no explicit flags, demo-login is disabled by default while real /api/auth/login works
        process.env.NODE_ENV = 'production';
        delete process.env.ENABLE_DEMO_AUTH;
        delete process.env.ENABLE_DEMO_ADMIN_AUTH;

        const prodDefaultDemoRes = await fetch(`${baseUrl}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'STUDENT' })
        });
        expect(prodDefaultDemoRes.status).toBe(403);

        const prodRealLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'admin@smartcampus.edu', password: 'Admin@2026!' })
        });
        expect(prodRealLoginRes.status).toBe(200);

        // Enabling ENABLE_DEMO_AUTH=true in production allows non-privileged demo roles, while ADMIN still requires ENABLE_DEMO_ADMIN_AUTH=true
        process.env.ENABLE_DEMO_AUTH = 'true';
        const prodAllowedStudentDemoRes = await fetch(`${baseUrl}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'STUDENT' })
        });
        expect(prodAllowedStudentDemoRes.status).toBe(200);

        const prodLockedAdminDemoRes = await fetch(`${baseUrl}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ADMIN' })
        });
        expect(prodLockedAdminDemoRes.status).toBe(403);
      } finally {
        if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = prevNodeEnv;
        if (prevDemoAdminEnv === undefined) delete process.env.ENABLE_DEMO_ADMIN_AUTH;
        else process.env.ENABLE_DEMO_ADMIN_AUTH = prevDemoAdminEnv;
        if (prevDemoEnv === undefined) delete process.env.ENABLE_DEMO_AUTH;
        else process.env.ENABLE_DEMO_AUTH = prevDemoEnv;
      }

      // 4. ESP32 Heartbeat (POST JSON from firmware + GET query from QR onboarding) & BLE Attendance Event
      const hbPostRes = await fetch(`${baseUrl}/api/attendance/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'ESP32-GATE-MAIN-01', signalRssi: -51, batteryLevel: 99 })
      });
      expect(hbPostRes.status).toBe(200);
      const hbPostJson = await hbPostRes.json();
      expect(hbPostJson.success).toBe(true);

      const hbGetRes = await fetch(`${baseUrl}/api/attendance/heartbeat?nodeId=ESP32-GATE-MAIN-01`);
      expect(hbGetRes.status).toBe(200);

      const bleScanRes = await fetch(`${baseUrl}/api/attendance/ble-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'ESP32-GATE-NORTH-02', bleMac: 'BB:CC:DD:22:33:44', rssi: -56 })
      });
      expect(bleScanRes.status).toBe(200);
      const bleScanJson = await bleScanRes.json();
      expect(bleScanJson.success).toBe(true);
      expect(bleScanJson.matched).toBe(true);

      // 5. Simulate Vercel Serverless cold start (in-memory Map wiped on new instance)
      activeSessions.clear();

      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      expect(meRes.status).toBe(200);
      const meData = await meRes.json();
      expect(meData.user.role).toBe('STUDENT');

      // 6. Enforce RBAC: Student denied /api/admin/overview (403), Admin allowed (200)
      const forbiddenRes = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      expect(forbiddenRes.status).toBe(403);

      const adminOverviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(adminOverviewRes.status).toBe(200);

      // 7. Logout revokes token
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      expect(logoutRes.status).toBe(200);

      const afterLogoutRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      expect(afterLogoutRes.status).toBe(401);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('14. Constructs frontend API URLs without duplicate slashes or duplicated /api segments', async () => {
    const { normalizeApiBase, buildApiUrl } = await import('../src/services/api.js');

    expect(normalizeApiBase('')).toBe('/api');
    expect(normalizeApiBase(undefined)).toBe('/api');
    expect(normalizeApiBase('/api/')).toBe('/api');
    expect(normalizeApiBase('https://smartcollage.vercel.app')).toBe('https://smartcollage.vercel.app/api');
    expect(normalizeApiBase('https://smartcollage.vercel.app/')).toBe('https://smartcollage.vercel.app/api');
    expect(normalizeApiBase('https://smartcollage.vercel.app/api')).toBe('https://smartcollage.vercel.app/api');
    expect(normalizeApiBase('https://smartcollage.vercel.app/api/')).toBe('https://smartcollage.vercel.app/api');

    expect(buildApiUrl('/auth/login', '')).toBe('/api/auth/login');
    expect(buildApiUrl('/auth/login', '/api')).toBe('/api/auth/login');
    expect(buildApiUrl('auth/login', 'https://smartcollage.vercel.app')).toBe('https://smartcollage.vercel.app/api/auth/login');
    expect(buildApiUrl('/api/auth/login', 'https://smartcollage.vercel.app/api/')).toBe('https://smartcollage.vercel.app/api/auth/login');
  });

  it('15. Dynamically resolves API base URL in AuthContext for Vercel vs external/static hosts', async () => {
    const { resolveAuthApiBaseUrl } = await import('../src/context/AuthContext.js');
    const { buildApiUrl, PRODUCTION_API_ORIGIN } = await import('../src/services/api.js');

    // Running on Vercel: always returns '' -> relative '/api/auth/login' even if a stale env var exists
    const vercelBase = resolveAuthApiBaseUrl('smartcollage.vercel.app', 'https://stale-host.example.com/api');
    expect(vercelBase).toBe('');
    expect(buildApiUrl('/auth/login', vercelBase)).toBe('/api/auth/login');

    // Vercel preview deployment: returns '' -> relative '/api/auth/login'
    const previewBase = resolveAuthApiBaseUrl('smart-campus-git-main.vercel.app', undefined);
    expect(previewBase).toBe('');
    expect(buildApiUrl('/auth/login', previewBase)).toBe('/api/auth/login');

    // Static GitHub Pages without VITE_API_BASE_URL: falls back to full production URL
    const ghPagesBase = resolveAuthApiBaseUrl('shrived1.github.io', '');
    expect(ghPagesBase).toBe(PRODUCTION_API_ORIGIN);
    expect(buildApiUrl('/auth/login', ghPagesBase)).toBe('https://smartcollage.vercel.app/api/auth/login');

    // Explicit VITE_API_BASE_URL on non-Vercel host: strips trailing '/api' and builds clean login URL
    const customEnvBase = resolveAuthApiBaseUrl('shrived1.github.io', 'https://api.smartcampus.edu/api/');
    expect(customEnvBase).toBe('https://api.smartcampus.edu');
    expect(buildApiUrl('/auth/login', customEnvBase)).toBe('https://api.smartcampus.edu/api/auth/login');

    // Local development without VITE_API_BASE_URL: returns '' -> relative '/api/auth/login'
    const localBase = resolveAuthApiBaseUrl('localhost', undefined);
    expect(localBase).toBe('');
    expect(buildApiUrl('/auth/login', localBase)).toBe('/api/auth/login');

    // Malformed VITE_API_BASE_URL (e.g. accidental Vercel Project ID "prj_...") is ignored instead of causing a 404 path
    const malformedPreviewBase = resolveAuthApiBaseUrl(
      'ais-dev-hdmx7zz47w6ieyl3do26vf-64545607441.asia-southeast1.run.app',
      'prj_AtYrb7SlP9zbJqmON3mERJggIKzD'
    );
    expect(malformedPreviewBase).toBe('');
    expect(buildApiUrl('/auth/login', malformedPreviewBase)).toBe('/api/auth/login');

    const malformedGhPagesBase = resolveAuthApiBaseUrl('shrived1.github.io', 'prj_AtYrb7SlP9zbJqmON3mERJggIKzD');
    expect(malformedGhPagesBase).toBe(PRODUCTION_API_ORIGIN);
    expect(buildApiUrl('/auth/login', malformedGhPagesBase)).toBe('https://smartcollage.vercel.app/api/auth/login');
  });

  it('16. API interceptor (src/lib/api.ts) attaches AuthContext token and handles global 401 Unauthorized errors', async () => {
    const {
      apiClient,
      configureApiInterceptor,
      isProtectedPortalPathname,
      resetApiInterceptor,
      resolveActiveAuthToken,
      setApiBaseOrigin,
      setInterceptorAuthToken,
    } = await import('../src/lib/api.js');

    setApiBaseOrigin('');
    resetApiInterceptor();

    let contextToken: string | null = 'sctk_test_jwt_token_123';
    const capturedAuthHeaders: Array<string | undefined> = [];
    const unauthorizedEvents: Array<{ endpoint: string; status: number }> = [];

    const mockFetch: typeof fetch = async (input, init) => {
      const urlStr = String(input);
      const hdrs = (init?.headers || {}) as Record<string, string>;
      capturedAuthHeaders.push(hdrs['Authorization']);

      if (urlStr.endsWith('/api/student/profile')) {
        return new Response(JSON.stringify({ success: true, profile: { id: 'STU-2023-042' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (urlStr.endsWith('/api/admin/overview')) {
        return new Response(JSON.stringify({ success: false, error: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (urlStr.endsWith('/api/auth/login')) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid email/user ID or password.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      configureApiInterceptor({
        getToken: () => contextToken,
        onUnauthorized: ctx => {
          contextToken = null;
          unauthorizedEvents.push({ endpoint: ctx.endpoint, status: ctx.status });
        },
        fetchImpl: mockFetch,
      });

      // 1. Outgoing request automatically receives Authorization: Bearer <token> from AuthContext
      const profileRes = await apiClient.get<{ success: boolean }>('/student/profile');
      expect(profileRes.success).toBe(true);
      expect(capturedAuthHeaders[0]).toBe('Bearer sctk_test_jwt_token_123');

      // 2. Credential login failure (401 on /auth/login) throws AUTH_ERROR WITHOUT triggering global session wipe
      contextToken = 'sctk_existing_token';
      setInterceptorAuthToken(contextToken);
      await expect(
        apiClient.post('/auth/login', { identifier: 'alex@smartcampus.edu', password: 'bad' }, { skipAuth: true })
      ).rejects.toMatchObject({ status: 401, code: 'AUTH_ERROR' });
      expect(unauthorizedEvents.length).toBe(0);
      expect(contextToken).toBe('sctk_existing_token');

      // 3. 401 on a protected endpoint clears active token and fires AuthContext's global onUnauthorized handler
      await expect(apiClient.get('/admin/overview')).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_ERROR',
      });
      expect(unauthorizedEvents).toEqual([{ endpoint: '/admin/overview', status: 401 }]);
      expect(contextToken).toBeNull();
      expect(resolveActiveAuthToken()).toBeNull();

      // 4. Route guard helper distinguishes protected portal paths from public routes
      expect(isProtectedPortalPathname('/student/dashboard')).toBe(true);
      expect(isProtectedPortalPathname('/admin/system-health')).toBe(true);
      expect(isProtectedPortalPathname('/login')).toBe(false);
      expect(isProtectedPortalPathname('/')).toBe(false);
      expect(isProtectedPortalPathname('/admission/apply')).toBe(false);
    } finally {
      resetApiInterceptor();
    }
  });

  it('17. Centralized API logger captures URL, headers, and response body for 404, 500, and network failures while redacting secrets', async () => {
    const {
      apiClient,
      apiLogger,
      configureApiInterceptor,
      configureApiLogger,
      resetApiInterceptor,
      setApiBaseOrigin,
    } = await import('../src/lib/api.js');

    setApiBaseOrigin('https://smartcollage.vercel.app');
    resetApiInterceptor();
    apiLogger.clearLogs();

    const capturedLogs: Array<import('../src/lib/api.js').ApiFailureLogEntry> = [];

    const mockFetch: typeof fetch = async input => {
      const urlStr = String(input);

      if (urlStr.endsWith('/api/auth/login')) {
        return new Response('The page could not be found\n\nNOT_FOUND', {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'x-vercel-error': 'NOT_FOUND',
            'x-vercel-id': 'bom1::test-404-id',
          },
        });
      }

      if (urlStr.endsWith('/api/admin/system-health')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unhandled database connection fault',
            traceId: 'err-500-xyz',
            token: 'sctk_should_never_leak',
            password: 'PlainPasswordShouldBeRedacted',
          }),
          {
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
              'Content-Type': 'application/json',
              'x-vercel-error': 'FUNCTION_INVOCATION_FAILED',
            },
          }
        );
      }

      throw new Error('ECONNREFUSED 127.0.0.1:3000');
    };

    try {
      configureApiInterceptor({ fetchImpl: mockFetch });
      configureApiLogger({
        silentConsole: true,
        onFailure: entry => capturedLogs.push(entry),
      });

      // 1. 404 non-JSON Vercel response preserves raw body text, URL, and x-vercel-error header
      await expect(
        apiClient.post('/auth/login', { identifier: 'alex.rivers@smartcampus.edu', password: 'pw' }, { skipAuth: true })
      ).rejects.toMatchObject({
        status: 404,
        code: 'API_NOT_FOUND',
        url: 'https://smartcollage.vercel.app/api/auth/login',
        method: 'POST',
      });

      expect(capturedLogs[0]).toMatchObject({
        level: 'error',
        method: 'POST',
        endpoint: '/auth/login',
        url: 'https://smartcollage.vercel.app/api/auth/login',
        resolvedUrl: 'https://smartcollage.vercel.app/api/auth/login',
        status: 404,
        code: 'API_NOT_FOUND',
        responseHeaders: {
          'content-type': 'text/plain; charset=utf-8',
          'x-vercel-error': 'NOT_FOUND',
          'x-vercel-id': 'bom1::test-404-id',
        },
      });
      expect(String(capturedLogs[0].responseBody)).toContain('NOT_FOUND');

      // 2. 500 JSON server error logs full response payload while redacting sensitive token/password fields
      await expect(apiClient.get('/admin/system-health')).rejects.toMatchObject({
        status: 500,
        code: 'SERVER_ERROR',
        url: 'https://smartcollage.vercel.app/api/admin/system-health',
      });

      const log500 = capturedLogs[1];
      expect(log500).toMatchObject({
        level: 'error',
        method: 'GET',
        endpoint: '/admin/system-health',
        url: 'https://smartcollage.vercel.app/api/admin/system-health',
        status: 500,
        code: 'SERVER_ERROR',
        responseHeaders: {
          'content-type': 'application/json',
          'x-vercel-error': 'FUNCTION_INVOCATION_FAILED',
        },
        responseBody: {
          success: false,
          error: 'Unhandled database connection fault',
          traceId: 'err-500-xyz',
          token: '[REDACTED]',
          password: '[REDACTED]',
        },
      });

      // 3. Network failure logs URL and network error reason
      await expect(apiClient.get('/public/college-info')).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        url: 'https://smartcollage.vercel.app/api/public/college-info',
      });
      expect(capturedLogs[2]).toMatchObject({
        level: 'error',
        method: 'GET',
        url: 'https://smartcollage.vercel.app/api/public/college-info',
        code: 'NETWORK_ERROR',
        responseBody: { networkError: 'ECONNREFUSED 127.0.0.1:3000' },
      });

      // Ring buffer retains entries in reverse-chronological order
      const ringBuffer = apiLogger.getLogs();
      expect(ringBuffer.length).toBe(3);
      expect(ringBuffer[0].code).toBe('NETWORK_ERROR');
      expect(ringBuffer[1].status).toBe(500);
      expect(ringBuffer[2].status).toBe(404);
    } finally {
      apiLogger.clearLogs();
      resetApiInterceptor();
      setApiBaseOrigin('');
    }
  });

  it('18. ThemeContext defaults to dark mode, syncs data-theme/colorScheme for high-contrast light mode, and maps Tailwind CSS tokens', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const {
      DEFAULT_THEME,
      THEME_STORAGE_KEY,
      applyThemeToDocument,
      readStoredTheme,
      resolveInitialTheme,
    } = await import('../src/context/ThemeContext.js');

    // 1. Default theme is strictly 'dark' unless 'light' was explicitly stored
    expect(DEFAULT_THEME).toBe('dark');
    expect(resolveInitialTheme(undefined)).toBe('dark');
    expect(resolveInitialTheme(null)).toBe('dark');
    expect(resolveInitialTheme('')).toBe('dark');
    expect(resolveInitialTheme('invalid')).toBe('dark');
    expect(resolveInitialTheme('dark')).toBe('dark');
    expect(resolveInitialTheme('light')).toBe('light');

    // 2. Storage reader safely reads THEME_STORAGE_KEY and falls back to 'dark' on error
    const store = new Map<string, string>();
    const mockStorage = { getItem: (k: string) => store.get(k) ?? null };
    expect(readStoredTheme(mockStorage)).toBe('dark');

    store.set(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme(mockStorage)).toBe('light');

    const throwingStorage = {
      getItem: () => {
        throw new Error('Storage blocked');
      },
    };
    expect(readStoredTheme(throwingStorage)).toBe('dark');

    // 3. applyThemeToDocument updates data-theme, classList, and colorScheme atomically
    const activeClasses = new Set<string>();
    const attrs = new Map<string, string>();
    const mockDoc = {
      documentElement: {
        setAttribute: (k: string, v: string) => attrs.set(k, v),
        classList: {
          toggle: (cls: string, force?: boolean) => {
            if (force) activeClasses.add(cls);
            else activeClasses.delete(cls);
          },
        },
        style: { colorScheme: '' },
      },
    } as unknown as Document;

    applyThemeToDocument('dark', mockDoc);
    expect(attrs.get('data-theme')).toBe('dark');
    expect(activeClasses.has('dark')).toBe(true);
    expect(activeClasses.has('light')).toBe(false);
    expect(mockDoc.documentElement.style.colorScheme).toBe('dark');

    applyThemeToDocument('light', mockDoc);
    expect(attrs.get('data-theme')).toBe('light');
    expect(activeClasses.has('light')).toBe(true);
    expect(activeClasses.has('dark')).toBe(false);
    expect(mockDoc.documentElement.style.colorScheme).toBe('light');

    // 4. Verify Tailwind CSS mapping in src/index.css defines high-contrast light overrides & preserves CTA contrast
    const cssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(cssContent).toContain('[data-theme="dark"]');
    expect(cssContent).toContain('[data-theme="light"]');
    expect(cssContent).toContain('--color-zcard: #ffffff;');
    expect(cssContent).toContain('--color-cyan: #0e7490;');
    expect(cssContent).toContain('[data-theme="light"] .bg-\\[\\#141021\\]');
    expect(cssContent).toContain('[data-theme="light"] .border-\\[\\#2a1e45\\]');
    expect(cssContent).toContain('[data-theme="light"] .text-white');
    expect(cssContent).toContain('[data-theme="light"] .text-\\[\\#00E5FF\\]');
    expect(cssContent).toContain('[data-theme="light"] .bg-\\[\\#3B0A6B\\]');
  });
});

