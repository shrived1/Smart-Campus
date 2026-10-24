import { Router } from 'express';
import { db } from '../db.js';
import { authenticateSession, requireRole, AuthenticatedRequest } from '../auth.js';
import { BLEAttendanceEvent, AttendanceDayRecord } from '../types.js';

const router = Router();

// Track recent BLE detections for deduplication: key = `${studentId}:${nodeId}`, value = timestamp
const recentDetections = new Map<string, number>();

// Helper to check device online status based on heartbeat threshold
function updateDeviceStatuses() {
  const now = Date.now();
  const timeoutMs = 45 * 1000; // 45 seconds timeout
  for (const device of db.devices) {
    const lastSeenTime = new Date(device.lastSeen).getTime();
    device.status = (now - lastSeenTime <= timeoutMs) ? 'ONLINE' : 'OFFLINE';
  }
}

// 1. ESP32 Node Heartbeat endpoint
router.post('/heartbeat', (req, res) => {
  const { nodeId, firmwareVersion, ipAddress, macAddress, signalRssi, batteryLevel } = req.body;

  if (!nodeId) {
    res.status(400).json({ success: false, error: 'nodeId is required' });
    return;
  }

  let device = db.devices.find(d => d.nodeId === nodeId);
  const nowStr = new Date().toISOString();

  if (device) {
    device.lastSeen = nowStr;
    device.status = 'ONLINE';
    if (signalRssi !== undefined) device.signalStrengthRssi = Number(signalRssi);
    if (batteryLevel !== undefined) device.batteryLevel = Number(batteryLevel);
    if (firmwareVersion) device.firmwareVersion = String(firmwareVersion);
    if (ipAddress) device.ipAddress = String(ipAddress);
  } else {
    // Auto-register new node
    device = {
      nodeId,
      nodeName: `ESP32 Node (${nodeId})`,
      nodeType: nodeId.toLowerCase().includes('exit') ? 'EXIT' : 'ENTRY',
      location: 'Unassigned Gate Location',
      macAddress: macAddress || '24:6F:28:XX:XX:XX',
      ipAddress: ipAddress || req.ip || '192.168.10.x',
      firmwareVersion: firmwareVersion || 'v2.4.1-BLE',
      status: 'ONLINE',
      lastSeen: nowStr,
      signalStrengthRssi: signalRssi ? Number(signalRssi) : -60,
      detectionsToday: 0,
      batteryLevel: batteryLevel ? Number(batteryLevel) : 100,
      isRegistered: true
    };
    db.devices.push(device);
  }

  res.json({
    success: true,
    message: 'Heartbeat acknowledged',
    serverTime: nowStr,
    config: {
      detectionWindowSeconds: db.settings.bleDetectionWindowSeconds,
      thresholdPercent: db.settings.attendanceThresholdPercent
    }
  });
});

// 2. ESP32 BLE Detection Event ingestion endpoint
router.post('/ble-event', (req, res) => {
  const { nodeId, bleMac, rssi, timestamp } = req.body;

  if (!nodeId || !bleMac) {
    res.status(400).json({ success: false, error: 'nodeId and bleMac are required for BLE detection events' });
    return;
  }

  updateDeviceStatuses();
  const device = db.devices.find(d => d.nodeId === nodeId);
  if (!device) {
    res.status(404).json({ success: false, error: `ESP32 node '${nodeId}' not registered in device directory.` });
    return;
  }

  // Update device telemetry
  device.lastSeen = new Date().toISOString();
  device.status = 'ONLINE';
  device.detectionsToday += 1;

  // Match BLE MAC to student
  const student = db.students.find(s => s.bleMac.toUpperCase() === String(bleMac).trim().toUpperCase());
  if (!student) {
    // Record unidentified beacon event
    res.status(200).json({
      success: true,
      matched: false,
      message: `Beacon MAC ${bleMac} detected with RSSI ${rssi} dBm, but not bound to any enrolled student.`
    });
    return;
  }

  // Deduplication check within detection window (e.g. 300 seconds)
  const dedupKey = `${student.id}:${nodeId}`;
  const now = Date.now();
  const lastTime = recentDetections.get(dedupKey) || 0;
  const windowMs = db.settings.bleDetectionWindowSeconds * 1000;

  if (now - lastTime < windowMs) {
    res.status(200).json({
      success: true,
      matched: true,
      deduplicated: true,
      message: `Ignored duplicate BLE detection for ${student.name} within ${db.settings.bleDetectionWindowSeconds}s window.`
    });
    return;
  }

  recentDetections.set(dedupKey, now);

  const eventTime = timestamp ? new Date(timestamp) : new Date();
  const timeFormatted = eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const todayStr = eventTime.toISOString().split('T')[0];

  // Ingest Event into BLE events feed
  const bleEvent: BLEAttendanceEvent = {
    id: `ble-evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nodeId: device.nodeId,
    nodeType: device.nodeType,
    bleMac: student.bleMac,
    studentId: student.id,
    studentName: student.name,
    rollNumber: student.rollNumber,
    rssi: Number(rssi) || -60,
    timestamp: eventTime.toISOString(),
    processed: true
  };
  db.bleEvents.unshift(bleEvent);

  // Update or create AttendanceDayRecord for this student
  let dayRecord = db.attendanceRecords.find(r => r.studentId === student.id && r.date === todayStr);

  if (!dayRecord) {
    dayRecord = {
      id: `att-rec-${student.id}-${todayStr}`,
      studentId: student.id,
      date: todayStr,
      status: 'PRESENT',
      firstEntryTime: device.nodeType === 'ENTRY' ? timeFormatted : null,
      lastExitTime: device.nodeType === 'EXIT' ? timeFormatted : null,
      totalMinutesCampus: 0,
      verificationMethod: 'BLE_ESP32',
      eventsCount: 1,
      notes: `Verified by ${device.nodeName} (${device.nodeId})`
    };
    db.attendanceRecords.unshift(dayRecord);
  } else {
    dayRecord.eventsCount += 1;
    if (device.nodeType === 'ENTRY') {
      if (!dayRecord.firstEntryTime) {
        dayRecord.firstEntryTime = timeFormatted;
        dayRecord.status = 'PRESENT';
      }
    } else if (device.nodeType === 'EXIT') {
      dayRecord.lastExitTime = timeFormatted;
    }
  }

  res.json({
    success: true,
    matched: true,
    deduplicated: false,
    event: bleEvent,
    dayRecord,
    message: `Attendance marked successfully for ${student.name} (${device.nodeType} at ${timeFormatted})`
  });
});

// 3. Get ESP32 devices status & monitor
router.get('/devices', authenticateSession, (req, res) => {
  updateDeviceStatuses();
  res.json({
    success: true,
    devices: db.devices,
    activeNodesCount: db.devices.filter(d => d.status === 'ONLINE').length,
    totalNodesCount: db.devices.length
  });
});

// 4. Live detection events feed
router.get('/live', authenticateSession, (req, res) => {
  res.json({
    success: true,
    events: db.bleEvents.slice(0, 30)
  });
});

// 5. Attendance history query (with role checking)
router.get('/history', authenticateSession, (req: AuthenticatedRequest, res) => {
  const targetStudentId = req.query.studentId as string || (req.user?.role === 'STUDENT' ? req.user.studentId : undefined);

  if (!targetStudentId) {
    // Return all records for admin/faculty
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'FACULTY') {
      res.status(403).json({ success: false, error: 'Unauthorized to view multi-student attendance records' });
      return;
    }
    res.json({ success: true, records: db.attendanceRecords });
    return;
  }

  // Verify access for student or parent
  if (req.user?.role === 'STUDENT' && req.user.studentId !== targetStudentId) {
    res.status(403).json({ success: false, error: 'Access denied: Students can only view their own attendance.' });
    return;
  }
  if (req.user?.role === 'PARENT' && req.user.linkedStudentId !== targetStudentId) {
    res.status(403).json({ success: false, error: 'Access denied: Parents can only view their linked child attendance.' });
    return;
  }

  const records = db.attendanceRecords.filter(r => r.studentId === targetStudentId);
  const subjectSummaries = db.subjectAttendance.get(targetStudentId) || [];

  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const absentDays = records.filter(r => r.status === 'ABSENT').length;
  const overallPercentage = totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(1)) : 88.5;

  res.json({
    success: true,
    studentId: targetStudentId,
    overallPercentage,
    threshold: db.settings.attendanceThresholdPercent,
    isLowAttendance: overallPercentage < db.settings.attendanceThresholdPercent,
    stats: {
      totalDays,
      presentDays,
      absentDays
    },
    records,
    subjectSummaries
  });
});

// 6. Manual attendance correction (Admin or Faculty only, with audit log)
router.post('/manual-correction', authenticateSession, requireRole('ADMIN', 'FACULTY'), (req: AuthenticatedRequest, res) => {
  const { studentId, date, status, notes } = req.body;

  if (!studentId || !date || !status) {
    res.status(400).json({ success: false, error: 'studentId, date, and status are required' });
    return;
  }

  let record = db.attendanceRecords.find(r => r.studentId === studentId && r.date === date);
  const oldStatus = record ? record.status : 'NONE';

  if (!record) {
    record = {
      id: `att-rec-${studentId}-${date}`,
      studentId,
      date,
      status,
      firstEntryTime: status === 'PRESENT' ? '09:00 AM' : null,
      lastExitTime: status === 'PRESENT' ? '04:00 PM' : null,
      totalMinutesCampus: status === 'PRESENT' ? 420 : 0,
      verificationMethod: 'MANUAL',
      verifiedBy: req.user?.name || req.user?.email,
      eventsCount: 0,
      notes
    };
    db.attendanceRecords.unshift(record);
  } else {
    record.status = status;
    record.verificationMethod = 'MANUAL';
    record.verifiedBy = req.user?.name || req.user?.email;
    if (notes) record.notes = notes;
  }

  // Audit log
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ATTENDANCE_MANUAL_CORRECTION',
    actorId: req.user?.userId || 'unknown',
    actorRole: req.user?.role || 'ADMIN',
    actorName: req.user?.name || 'Administrator',
    details: `Manual attendance override for student ${studentId} on ${date}. Changed from ${oldStatus} to ${status}. Notes: ${notes || 'None'}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Attendance record updated successfully', record });
});

export default router;
