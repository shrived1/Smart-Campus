import { Router } from 'express';
import { db } from '../db.js';
import { authenticateSession, requireRole, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Student-only guard (or Admin viewing student details)
router.use(authenticateSession);

// 1. Student Profile
router.get('/profile', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.role === 'STUDENT' ? req.user.studentId : (req.query.studentId as string);
  if (!studentId) {
    res.status(400).json({ success: false, error: 'Student ID missing' });
    return;
  }

  const student = db.students.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, error: 'Student record not found' });
    return;
  }

  res.json({ success: true, profile: student });
});

// Update personal details (non-academic only)
router.patch('/profile', requireRole('STUDENT'), (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId;
  const student = db.students.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ success: false, error: 'Student record not found' });
    return;
  }

  const { phone, address, bleMac } = req.body;
  if (phone) student.phone = String(phone).trim();
  if (address) student.address = String(address).trim();
  if (bleMac) student.bleMac = String(bleMac).trim().toUpperCase();

  res.json({ success: true, message: 'Contact details updated successfully', profile: student });
});

// 2. Timetable
router.get('/timetable', (req: AuthenticatedRequest, res) => {
  const day = req.query.day as string;
  let slots = db.timetable;
  if (day) {
    slots = slots.filter(s => s.day.toLowerCase() === day.toLowerCase());
  }
  res.json({ success: true, timetable: slots });
});

// 3. Subjects
router.get('/subjects', (req, res) => {
  res.json({ success: true, subjects: db.subjects });
});

// 4. Events
router.get('/events', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || '';
  const events = db.events.map(e => ({
    ...e,
    isRegistered: e.registeredStudentIds.includes(studentId)
  }));
  res.json({ success: true, events });
});

router.post('/events/:eventId/register', requireRole('STUDENT'), (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  const studentId = req.user?.studentId;
  if (!studentId) {
    res.status(400).json({ success: false, error: 'Student ID not bound to session' });
    return;
  }

  const event = db.events.find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  if (event.registeredStudentIds.includes(studentId)) {
    res.status(400).json({ success: false, error: 'You are already registered for this event.' });
    return;
  }

  if (event.registeredCount >= event.capacity) {
    res.status(400).json({ success: false, error: 'Event capacity reached. Registration is full.' });
    return;
  }

  event.registeredStudentIds.push(studentId);
  event.registeredCount += 1;

  res.json({ success: true, message: `Successfully registered for ${event.title}!`, event });
});

router.post('/events/:eventId/cancel', requireRole('STUDENT'), (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  const studentId = req.user?.studentId;
  const event = db.events.find(e => e.id === eventId);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  event.registeredStudentIds = event.registeredStudentIds.filter(id => id !== studentId);
  event.registeredCount = Math.max(0, event.registeredCount - 1);

  res.json({ success: true, message: 'Registration cancelled', event });
});

// 5. E-Documents
router.get('/documents', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || (req.query.studentId as string);
  const docs = db.documents.filter(d => d.studentId === studentId);
  res.json({ success: true, documents: docs });
});

// 6. E-Certificates & Achievements
router.get('/certificates', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || (req.query.studentId as string);
  const certs = db.certificates.filter(c => c.studentId === studentId);
  res.json({ success: true, certificates: certs });
});

// 7. Fees
router.get('/fees', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || (req.query.studentId as string);
  const invoice = db.feeInvoices.find(f => f.studentId === studentId);
  
  res.json({
    success: true,
    invoice: invoice || null,
    paymentGatewayStatus: {
      isAvailable: false,
      notice: "Real payment gateway integration requires institutional merchant gateway credentials. Direct simulated payments are disabled per strict compliance policy."
    }
  });
});

// 8. Marks & Results
router.get('/marks', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || (req.query.studentId as string);
  const records = db.marksRecords.filter(m => m.studentId === studentId && m.isPublished);
  res.json({ success: true, marksRecords: records });
});

// 9. Assignments & Submissions
router.get('/assignments', (req: AuthenticatedRequest, res) => {
  const studentId = req.user?.studentId || '';
  const assignments = db.assignments.map(a => {
    const submission = a.submissions.find(s => s.studentId === studentId);
    return {
      ...a,
      submission: submission || null
    };
  });
  res.json({ success: true, assignments });
});

router.post('/assignments/:assignmentId/submit', requireRole('STUDENT'), (req: AuthenticatedRequest, res) => {
  const { assignmentId } = req.params;
  const { fileName, fileData } = req.body;
  const studentId = req.user?.studentId;

  if (!fileName) {
    res.status(400).json({ success: false, error: 'File name and submission content required' });
    return;
  }

  const assignment = db.assignments.find(a => a.id === assignmentId);
  if (!assignment) {
    res.status(404).json({ success: false, error: 'Assignment not found' });
    return;
  }

  // Validate deadline
  const now = new Date();
  const deadline = new Date(assignment.deadline);
  const isLate = now > deadline;

  // Validate file extension
  const ext = fileName.split('.').pop()?.toUpperCase() || '';
  if (!assignment.allowedFormats.includes(ext) && !assignment.allowedFormats.includes('*')) {
    res.status(400).json({
      success: false,
      error: `Invalid file format '.${ext}'. Allowed formats: ${assignment.allowedFormats.join(', ')}`
    });
    return;
  }

  const student = db.students.find(s => s.id === studentId);

  // Check if existing submission
  const existingSubIndex = assignment.submissions.findIndex(s => s.studentId === studentId);
  const newSub = {
    id: `sub-${Date.now()}`,
    assignmentId,
    studentId: studentId!,
    studentName: student?.name || 'Alex Rivers',
    rollNumber: student?.rollNumber || 'CS2023-042',
    submittedAt: now.toISOString(),
    fileName,
    fileSize: "2.4 MB",
    status: (isLate ? 'LATE' : 'SUBMITTED') as 'LATE' | 'SUBMITTED'
  };

  if (existingSubIndex >= 0) {
    assignment.submissions[existingSubIndex] = newSub;
  } else {
    assignment.submissions.push(newSub);
  }

  res.json({
    success: true,
    message: isLate ? 'Assignment submitted (Flagged as Late)' : 'Assignment submitted successfully!',
    submission: newSub
  });
});

export default router;
