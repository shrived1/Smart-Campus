import { Router } from 'express';
import { db } from '../db.js';
import { authenticateSession, requireRole, type AuthenticatedRequest } from '../auth.js';

const router = Router();

router.use(authenticateSession);
router.use(requireRole('FACULTY', 'ADMIN'));

// 1. Faculty Dashboard overview
router.get('/overview', (req: AuthenticatedRequest, res) => {
  const facultyId = req.user?.facultyId || 'FAC-101';
  const faculty = db.faculty.find(f => f.id === facultyId) || db.faculty[0];

  const assignedClasses = faculty.assignedClasses;
  const assignedSubjects = db.subjects.filter(s => faculty.assignedSubjects.includes(s.code));
  
  // Enrolled students in assigned section (e.g. CS-3A)
  const students = db.students.filter(s => s.semester === 5 && s.section === 'A');

  // Low attendance count
  let lowAttendanceCount = 0;
  for (const s of students) {
    const list = db.subjectAttendance.get(s.id) || [];
    if (list.some(sub => faculty.assignedSubjects.includes(sub.subjectCode) && sub.isLowAttendance)) {
      lowAttendanceCount++;
    }
  }

  // Pending assignment evaluations
  let pendingEvaluations = 0;
  for (const a of db.assignments.filter(asg => asg.facultyId === faculty.id)) {
    for (const sub of a.submissions) {
      if (sub.status === 'SUBMITTED' || sub.status === 'LATE') {
        pendingEvaluations++;
      }
    }
  }

  res.json({
    success: true,
    faculty,
    stats: {
      assignedClassesCount: assignedClasses.length,
      totalStudentsCount: students.length,
      assignedSubjectsCount: assignedSubjects.length,
      lowAttendanceCount,
      pendingEvaluations
    },
    assignedSubjects,
    students
  });
});

// 2. Class students directory
router.get('/students', (req: AuthenticatedRequest, res) => {
  const students = db.students.map(s => {
    const records = db.attendanceRecords.filter(r => r.studentId === s.id);
    const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const totalCount = records.length || 1;
    const percentage = Number(((presentCount / totalCount) * 100).toFixed(1));
    return {
      ...s,
      attendancePercentage: percentage,
      isLowAttendance: percentage < db.settings.attendanceThresholdPercent
    };
  });
  res.json({ success: true, students });
});

// 3. Create Assignment
router.post('/assignments', (req: AuthenticatedRequest, res) => {
  const { subjectCode, title, instructions, deadline, maxMarks, allowedFormats, classGroup } = req.body;

  if (!subjectCode || !title || !deadline) {
    res.status(400).json({ success: false, error: 'Subject code, title, and deadline are required.' });
    return;
  }

  const faculty = db.faculty.find(f => f.id === req.user?.facultyId) || db.faculty[0];
  const subject = db.subjects.find(s => s.code === subjectCode);

  const newAssignment = {
    id: `asg-${Date.now()}`,
    subjectCode,
    subjectName: subject?.name || 'Advanced Subject',
    facultyId: faculty.id,
    facultyName: faculty.name,
    classGroup: classGroup || 'CS-3A',
    title,
    instructions: instructions || '',
    issuedDate: new Date().toISOString().split('T')[0],
    deadline,
    maxMarks: Number(maxMarks) || 50,
    allowedFormats: allowedFormats || ['PDF', 'ZIP'],
    submissions: []
  };

  db.assignments.unshift(newAssignment);

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ASSIGNMENT_CREATED',
    actorId: req.user?.userId || '',
    actorRole: 'FACULTY',
    actorName: req.user?.name || '',
    details: `Created assignment '${title}' for subject ${subjectCode}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Assignment published successfully', assignment: newAssignment });
});

// 4. Grade Submission
router.post('/assignments/:assignmentId/submissions/:submissionId/evaluate', (req: AuthenticatedRequest, res) => {
  const { assignmentId, submissionId } = req.params;
  const { marksObtained, feedback } = req.body;

  const assignment = db.assignments.find(a => a.id === assignmentId);
  if (!assignment) {
    res.status(404).json({ success: false, error: 'Assignment not found' });
    return;
  }

  const submission = assignment.submissions.find(s => s.id === submissionId);
  if (!submission) {
    res.status(404).json({ success: false, error: 'Submission not found' });
    return;
  }

  submission.marksObtained = Number(marksObtained);
  submission.feedback = String(feedback || '');
  submission.status = 'EVALUATED';
  submission.evaluatedBy = req.user?.name || 'Faculty Evaluator';
  submission.evaluatedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ASSIGNMENT_EVALUATED',
    actorId: req.user?.userId || '',
    actorRole: 'FACULTY',
    actorName: req.user?.name || '',
    details: `Graded submission for ${submission.studentName} on ${assignment.title}. Marks: ${marksObtained}/${assignment.maxMarks}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: 'Submission evaluated successfully', submission });
});

// 5. Marks Entry & Publishing
router.post('/marks/entry', (req: AuthenticatedRequest, res) => {
  const { studentId, semester, subjectCode, internalMarks, practicalMarks, isPublished } = req.body;

  if (!studentId || !subjectCode) {
    res.status(400).json({ success: false, error: 'studentId and subjectCode required' });
    return;
  }

  let record = db.marksRecords.find(m => m.studentId === studentId && m.semester === Number(semester || 5));
  if (!record) {
    record = {
      studentId,
      semester: Number(semester || 5),
      academicYear: db.settings.academicYear,
      sgpa: 8.5,
      cgpa: 8.7,
      isPublished: isPublished ?? false,
      subjects: []
    };
    db.marksRecords.push(record);
  }

  const sub = record.subjects.find(s => s.subjectCode === subjectCode);
  if (sub) {
    if (internalMarks !== undefined) sub.internalMarks = Number(internalMarks);
    if (practicalMarks !== undefined) sub.practicalMarks = Number(practicalMarks);
    sub.total = sub.internalMarks + sub.theoryMarks + sub.practicalMarks;
  }

  if (isPublished !== undefined) {
    record.isPublished = Boolean(isPublished);
  }

  res.json({ success: true, message: 'Marks updated successfully', record });
});

export default router;
