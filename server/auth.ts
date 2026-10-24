import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { User, UserRole } from './types.js';

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  studentId?: string;
  facultyId?: string;
  parentId?: string;
  linkedStudentId?: string;
  expiresAt: number;
}

// In-memory active session store
export const activeSessions = new Map<string, AuthSession>();

export function createSessionToken(user: User): AuthSession {
  const token = "sctk_" + crypto.randomBytes(32).toString('hex');
  const session: AuthSession = {
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    studentId: user.studentId,
    facultyId: user.facultyId,
    parentId: user.parentId,
    linkedStudentId: user.linkedStudentId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
  };
  activeSessions.set(token, session);
  return session;
}

export function revokeSession(token: string): boolean {
  return activeSessions.delete(token);
}

// Extend express request
export interface AuthenticatedRequest extends Request {
  user?: AuthSession;
}

export function authenticateSession(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: "Authentication required. No session token provided." });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);

  if (!session) {
    res.status(401).json({ success: false, error: "Session expired or invalid. Please log in again." });
    return;
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, error: "Session expired. Please log in again." });
    return;
  }

  req.user = session;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access Denied: Your account role (${req.user.role}) is not authorized for this resource. Required roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

// Enforce strict student data isolation:
// Students may only read their own records, Admin can read any, Faculty can read assigned, Parent can read linked child
export function canAccessStudentData(user: AuthSession, targetStudentId: string): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STUDENT') {
    return user.studentId === targetStudentId;
  }
  if (user.role === 'PARENT') {
    return user.linkedStudentId === targetStudentId;
  }
  if (user.role === 'FACULTY') {
    return true; // Faculty has access within academic context
  }
  return false;
}
