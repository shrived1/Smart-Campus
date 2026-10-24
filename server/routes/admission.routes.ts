import { Router } from 'express';
import { db } from '../db.js';
import { authenticateSession, requireRole, AuthenticatedRequest } from '../auth.js';
import { AdmissionApplication } from '../types.js';

const router = Router();

// Public: Apply for admission (no auth token required)
router.post('/apply', (req, res) => {
  const {
    applicantName,
    email,
    phone,
    gender,
    dob,
    courseRequested,
    department,
    previousSchool,
    previousQualification,
    marksPercentage,
    documents
  } = req.body;

  if (!applicantName || !email || !courseRequested) {
    res.status(400).json({ success: false, error: 'Applicant name, email, and course selection are mandatory.' });
    return;
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const refNumber = `SC-ADM-2026-${randomNum}`;
  const now = new Date().toISOString();

  const newApp: AdmissionApplication = {
    id: `adm-app-${Date.now()}`,
    refNumber,
    applicantName: String(applicantName).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone || '',
    gender: gender || 'Unspecified',
    dob: dob || '',
    courseRequested: String(courseRequested),
    department: department || 'Engineering & Technology',
    previousSchool: previousSchool || '',
    previousQualification: previousQualification || 'Senior Secondary',
    marksPercentage: Number(marksPercentage) || 0,
    applicationFeePaid: true,
    status: 'SUBMITTED',
    submittedAt: now,
    updatedAt: now,
    uploadedDocuments: Array.isArray(documents) ? documents : [
      { name: "Academic Transcripts.pdf", fileUrl: "#", verified: false }
    ]
  };

  db.applications.unshift(newApp);

  res.json({
    success: true,
    message: 'Admission application received successfully!',
    refNumber,
    application: newApp
  });
});

// Public: Track application status by refNumber
router.get('/track/:refNumber', (req, res) => {
  const { refNumber } = req.params;
  const app = db.applications.find(a => a.refNumber.toUpperCase() === String(refNumber).trim().toUpperCase());

  if (!app) {
    res.status(404).json({
      success: false,
      error: `No admission application found matching reference '${refNumber}'. Please check your application ID.`
    });
    return;
  }

  res.json({ success: true, application: app });
});

// Staff Protected Routes:
router.get('/applications', authenticateSession, requireRole('ADMISSION', 'ADMIN'), (req, res) => {
  const status = req.query.status as string;
  let list = db.applications;

  if (status && status !== 'ALL') {
    list = list.filter(a => a.status === status);
  }

  res.json({
    success: true,
    applications: list,
    stats: {
      total: db.applications.length,
      submitted: db.applications.filter(a => a.status === 'SUBMITTED').length,
      underReview: db.applications.filter(a => a.status === 'UNDER_REVIEW').length,
      approved: db.applications.filter(a => a.status === 'APPROVED').length,
      documentsRequired: db.applications.filter(a => a.status === 'DOCUMENTS_REQUIRED').length,
      rejected: db.applications.filter(a => a.status === 'REJECTED').length
    }
  });
});

// Update application status & notes
router.patch('/applications/:id/status', authenticateSession, requireRole('ADMISSION', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;

  const app = db.applications.find(a => a.id === id);
  if (!app) {
    res.status(404).json({ success: false, error: 'Application not found' });
    return;
  }

  const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED', 'REJECTED', 'WAITLISTED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const oldStatus = app.status;
  app.status = status;
  if (reviewNotes !== undefined) app.reviewNotes = String(reviewNotes);
  app.reviewerId = req.user?.userId;
  app.updatedAt = new Date().toISOString();

  // Audit log
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'ADMISSION_STATUS_UPDATED',
    actorId: req.user?.userId || '',
    actorRole: req.user?.role || 'ADMISSION',
    actorName: req.user?.name || '',
    details: `Updated application ${app.refNumber} (${app.applicantName}) from ${oldStatus} to ${status}. Notes: ${reviewNotes || 'N/A'}`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({ success: true, message: `Application status updated to ${status}`, application: app });
});

export default router;
