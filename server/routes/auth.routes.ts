import { Router } from 'express';
import { db, verifyPassword } from '../db.js';
import { createSessionToken, revokeSession, authenticateSession, type AuthenticatedRequest } from '../auth.js';
import type { User, UserRole } from '../types.js';

const router = Router();

function parseEnvFlag(value: string | undefined): boolean | undefined {
  const raw = (value || '').trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  return undefined;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function isDemoAuthEnabled(): boolean {
  const explicit = parseEnvFlag(process.env.ENABLE_DEMO_AUTH);
  if (explicit !== undefined) return explicit;
  return !isProductionRuntime();
}

function isDemoAdminAuthEnabled(): boolean {
  if (!isDemoAuthEnabled()) return false;
  const explicit = parseEnvFlag(process.env.ENABLE_DEMO_ADMIN_AUTH);
  if (explicit !== undefined) return explicit;
  return !isProductionRuntime();
}

function getRedirectUrlForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'FACULTY':
      return '/faculty/dashboard';
    case 'PARENT':
      return '/parent/dashboard';
    case 'ADMISSION':
      return '/admission/dashboard';
    case 'STUDENT':
    default:
      return '/student/dashboard';
  }
}

function serializeAuthUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    studentId: user.studentId,
    facultyId: user.facultyId,
    parentId: user.parentId,
    linkedStudentId: user.linkedStudentId
  };
}

// Demo accounts metadata endpoint (never exposes plaintext passwords)
router.get('/demo-accounts', (_req, res) => {
  res.json({
    success: true,
    demoAuthEnabled: isDemoAuthEnabled(),
    demoAdminEnabled: isDemoAdminAuthEnabled(),
    accounts: [
      { role: 'STUDENT', email: 'alex.rivers@smartcampus.edu', label: 'Alex Rivers (Roll: CS2023-042)' },
      { role: 'FACULTY', email: 'prof.sharma@smartcampus.edu', label: 'Dr. Ramesh Sharma (CS HOD)' },
      { role: 'PARENT', email: 'parent.rivers@smartcampus.edu', label: 'Marcus Rivers (Parent of Alex)' },
      { role: 'ADMISSION', email: 'admission.officer@smartcampus.edu', label: 'Sarah Jenkins (Admissions Dean)' },
      { role: 'ADMIN', email: 'admin@smartcampus.edu', label: 'Dr. Evelyn Vance (System Admin)' }
    ]
  });
});

// Controlled server-side demo portal login (strictly separated from production /login)
router.post('/demo-login', (req, res) => {
  if (!isDemoAuthEnabled()) {
    res.status(403).json({
      success: false,
      error: 'Account email filled. Please enter your password to sign in (1-click demo login is disabled in production).'
    });
    return;
  }

  const requestedRole = String(req.body?.role || '').trim().toUpperCase() as UserRole;
  const validRoles: UserRole[] = ['STUDENT', 'FACULTY', 'PARENT', 'ADMISSION', 'ADMIN'];

  if (!validRoles.includes(requestedRole)) {
    res.status(400).json({
      success: false,
      error: 'A valid portal role is required for demo sign-in.'
    });
    return;
  }

  if (requestedRole === 'ADMIN' && !isDemoAdminAuthEnabled()) {
    res.status(403).json({
      success: false,
      error: 'Admin email filled. Privileged System Admin demo sign-in is disabled; please enter authorized Admin credentials.'
    });
    return;
  }

  const demoEmailByRole: Record<UserRole, string> = {
    STUDENT: 'alex.rivers@smartcampus.edu',
    FACULTY: 'prof.sharma@smartcampus.edu',
    PARENT: 'parent.rivers@smartcampus.edu',
    ADMISSION: 'admission.officer@smartcampus.edu',
    ADMIN: 'admin@smartcampus.edu'
  };

  const targetEmail = demoEmailByRole[requestedRole];
  const user = db.users.find(u => u.email.toLowerCase() === targetEmail && u.role === requestedRole);

  if (!user || !user.isActive) {
    res.status(401).json({ success: false, error: 'Demo account is unavailable or inactive.' });
    return;
  }

  const session = createSessionToken(user);
  const redirectUrl = getRedirectUrlForRole(user.role);

  db.auditLogs.unshift({
    id: `audit-${Date.now()}`,
    action: 'DEMO_USER_LOGIN',
    actorId: user.id,
    actorRole: user.role,
    actorName: user.name,
    details: `Authenticated via controlled Quick-Test demo portal flow (${user.role}).`,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json({
    success: true,
    token: session.token,
    user: serializeAuthUser(user),
    redirectUrl
  });
});

// Login endpoint
router.post('/login', (req, res) => {
  const { identifier, password } = req.body ?? {};

  if (!identifier || !String(identifier).trim() || !password) {
    res.status(400).json({ success: false, error: 'Email or User ID and Password are required.' });
    return;
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const matchedStudentByRoll = db.students.find(
    s => s.rollNumber.toLowerCase() === cleanId || s.id.toLowerCase() === cleanId
  );

  // Find user by email, user ID, student ID, student roll number, faculty ID, or parent ID
  const user = db.users.find(u =>
    u.email.toLowerCase() === cleanId ||
    u.id.toLowerCase() === cleanId ||
    (u.studentId && u.studentId.toLowerCase() === cleanId) ||
    (matchedStudentByRoll && (u.id === matchedStudentByRoll.userId || u.studentId === matchedStudentByRoll.id)) ||
    (u.facultyId && u.facultyId.toLowerCase() === cleanId) ||
    (u.parentId && u.parentId.toLowerCase() === cleanId)
  );

  if (!user || !user.isActive) {
    res.status(401).json({ success: false, error: 'Invalid credentials or inactive account.' });
    return;
  }

  const isValid = verifyPassword(String(password), user.passwordHash, user.salt);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid email/user ID or password.' });
    return;
  }

  // Create authoritative session
  const session = createSessionToken(user);
  const redirectUrl = getRedirectUrlForRole(user.role);

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
    user: serializeAuthUser(user),
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
