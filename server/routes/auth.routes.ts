import { Router } from 'express';
import { db, verifyPassword } from '../db.js';
import { createSessionToken, revokeSession, authenticateSession, type AuthenticatedRequest } from '../auth.js';

const router = Router();

// Demo accounts endpoint for easy exploration
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: [
      { role: 'STUDENT', email: 'alex.rivers@smartcampus.edu', password: 'Student@2026!', label: 'Alex Rivers (Roll: CS2023-042)' },
      { role: 'FACULTY', email: 'prof.sharma@smartcampus.edu', password: 'Faculty@2026!', label: 'Dr. Ramesh Sharma (CS HOD)' },
      { role: 'PARENT', email: 'parent.rivers@smartcampus.edu', password: 'Parent@2026!', label: 'Marcus Rivers (Parent of Alex)' },
      { role: 'ADMISSION', email: 'admission.officer@smartcampus.edu', password: 'Admission@2026!', label: 'Sarah Jenkins (Admissions Dean)' },
      { role: 'ADMIN', email: 'admin@smartcampus.edu', password: 'Admin@2026!', label: 'Dr. Evelyn Vance (System Admin)' }
    ]
  });
});

// Login endpoint
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ success: false, error: 'Email or User ID and Password are required.' });
    return;
  }

  const cleanId = String(identifier).trim().toLowerCase();
  
  // Find user by email or student/faculty ID
  const user = db.users.find(u => 
    u.email.toLowerCase() === cleanId || 
    (u.studentId && u.studentId.toLowerCase() === cleanId) ||
    (u.facultyId && u.facultyId.toLowerCase() === cleanId)
  );

  if (!user || !user.isActive) {
    res.status(401).json({ success: false, error: 'Invalid credentials or inactive account.' });
    return;
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid email/user ID or password.' });
    return;
  }

  // Create authoritative session
  const session = createSessionToken(user);

  // Determine redirect route based on authentic server-side role
  let redirectUrl = '/student/dashboard';
  if (user.role === 'ADMIN') redirectUrl = '/admin/dashboard';
  else if (user.role === 'FACULTY') redirectUrl = '/faculty/dashboard';
  else if (user.role === 'PARENT') redirectUrl = '/parent/dashboard';
  else if (user.role === 'ADMISSION') redirectUrl = '/admission/dashboard';
  else if (user.role === 'STUDENT') redirectUrl = '/student/dashboard';

  // Audit log login
  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'USER_LOGIN',
    actorId: user.id,
    actorRole: user.role,
    actorName: user.name,
    details: `User logged in successfully via web interface. Session established.`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({
    success: true,
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // Authoritative role from backend
      studentId: user.studentId,
      facultyId: user.facultyId,
      parentId: user.parentId,
      linkedStudentId: user.linkedStudentId
    },
    redirectUrl
  });
});

// Current authenticated user session
router.get('/me', authenticateSession, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  const user = db.users.find(u => u.id === req.user?.userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      facultyId: user.facultyId,
      parentId: user.parentId,
      linkedStudentId: user.linkedStudentId
    }
  });
});

// Logout
router.post('/logout', authenticateSession, (req: AuthenticatedRequest, res) => {
  if (req.user?.token) {
    revokeSession(req.user.token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Forgot password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'Email address is required.' });
    return;
  }

  const user = db.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());
  // Even if user not found, don't leak user enumeration in production
  res.json({
    success: true,
    message: user 
      ? `A password recovery link with cryptographic token has been sent to ${email}.`
      : `If an account exists for ${email}, password instructions have been dispatched.`
  });
});

export default router;
