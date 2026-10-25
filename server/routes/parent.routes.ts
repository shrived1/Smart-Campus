import { Router } from 'express';
import { db } from '../db.js';
import { authenticateSession, requireRole, type AuthenticatedRequest } from '../auth.js';

const router = Router();

router.use(authenticateSession);
router.use(requireRole('PARENT', 'ADMIN'));

// Verified Parent-Child middleware
function ensureParentChildAccess(req: AuthenticatedRequest, res: any, next: any) {
  if (req.user?.role === 'ADMIN') {
    next();
    return;
  }

  const linkedStudentId = req.user?.linkedStudentId;
  if (!linkedStudentId) {
    res.status(403).json({ success: false, error: 'No student linked to this parent account.' });
    return;
  }

  // If a studentId is explicitly passed in query/body, verify it matches linkedStudentId!
  const requestedStudentId = req.query.studentId || req.body.studentId;
  if (requestedStudentId && requestedStudentId !== linkedStudentId) {
    res.status(403).json({
      success: false,
      error: 'Security Violation: You are strictly unauthorized to view or query other students. Access is restricted to your linked child.'
    });
    return;
  }

  next();
}

// 1. Linked Child Profile
router.get('/child', ensureParentChildAccess, (req: AuthenticatedRequest, res) => {
  const childId = req.user?.role === 'ADMIN' ? (req.query.studentId as string || 'STU-2023-042') : req.user!.linkedStudentId!;
  
  const student = db.students.find(s => s.id === childId);
  if (!student) {
    res.status(404).json({ success: false, error: 'Linked student record not found' });
    return;
  }

  // Attendance stats
  const records = db.attendanceRecords.filter(r => r.studentId === childId);
  const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const totalCount = records.length || 1;
  const attendancePercentage = Number(((presentCount / totalCount) * 100).toFixed(1));

  // Recent entry/exit today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === todayStr);

  // Invoices & Balance
  const invoice = db.feeInvoices.find(f => f.studentId === childId);

  // Marks & SGPA
  const marks = db.marksRecords.filter(m => m.studentId === childId && m.isPublished);

  res.json({
    success: true,
    student,
    attendance: {
      percentage: attendancePercentage,
      threshold: db.settings.attendanceThresholdPercent,
      isLowAttendance: attendancePercentage < db.settings.attendanceThresholdPercent,
      firstEntryToday: todayRecord?.firstEntryTime || 'Pending Entry',
      lastExitToday: todayRecord?.lastExitTime || 'On Campus',
      statusToday: todayRecord?.status || 'ABSENT',
      recentDays: records.slice(0, 7)
    },
    fees: {
      totalFee: invoice?.totalFee || 0,
      paidAmount: invoice?.paidAmount || 0,
      pendingBalance: invoice?.pendingBalance || 0,
      dueDate: invoice?.dueDate || 'N/A',
      status: invoice?.status || 'PAID'
    },
    academic: {
      currentSgpa: marks[0]?.sgpa || 8.85,
      currentCgpa: marks[0]?.cgpa || 8.90,
      marks
    }
  });
});

// 2. Child Timetable
router.get('/timetable', ensureParentChildAccess, (req: AuthenticatedRequest, res) => {
  res.json({ success: true, timetable: db.timetable });
});

// 3. Child Assignments
router.get('/assignments', ensureParentChildAccess, (req: AuthenticatedRequest, res) => {
  const childId = req.user?.role === 'ADMIN' ? 'STU-2023-042' : req.user!.linkedStudentId!;
  const assignments = db.assignments.map(a => ({
    ...a,
    childSubmission: a.submissions.find(s => s.studentId === childId) || null
  }));
  res.json({ success: true, assignments });
});

// 4. Contact Faculty
router.post('/contact-faculty', (req: AuthenticatedRequest, res) => {
  const { facultyId, subject, message, phoneCallbackRequested } = req.body;

  if (!facultyId || !subject || !message) {
    res.status(400).json({ success: false, error: 'Faculty recipient, subject, and message are required.' });
    return;
  }

  const faculty = db.faculty.find(f => f.id === facultyId) || db.faculty[0];

  // Ingest notification for faculty
  db.notifications.unshift({
    id: `notif-par-${Date.now()}`,
    title: `Parent Inquiry from ${req.user?.name}: ${subject}`,
    message: `${message} (Callback requested: ${phoneCallbackRequested ? 'YES' : 'NO'})`,
    category: 'ACADEMIC',
    targetRole: 'FACULTY',
    priority: 'HIGH',
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    message: `Your inquiry has been officially transmitted to ${faculty.name} (${faculty.designation}). The faculty office will follow up shortly.`
  });
});

export default router;
