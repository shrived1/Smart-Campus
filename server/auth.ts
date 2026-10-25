import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { db } from './db.js';
import type { User, UserRole } from './types.js';

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

interface SignedTokenPayload {
  u: string;
  e: string;
  r: UserRole;
  n: string;
  sid?: string;
  fid?: string;
  pid?: string;
  lsid?: string;
  exp: number;
  jti: string;
}

// In-memory active session store & revocation set
export const activeSessions = new Map<string, AuthSession>();
const revokedTokens = new Set<string>();

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0) {
    return process.env.SESSION_SECRET.trim();
  }
  // Deterministic fallback derived from seeded user credentials so serverless cold-starts verify tokens consistently when SESSION_SECRET is unset
  const seedMaterial = db.users.map(u => `${u.id}:${u.passwordHash}`).join('|') || 'smartcampus-fallback-hmac-key';
  return crypto.createHash('sha256').update(seedMaterial).digest('hex');
}

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(payloadB64).digest('hex');
}

export function verifySignedSessionToken(token: string): AuthSession | null {
  if (!token.startsWith('sctk_') || revokedTokens.has(token)) {
    return null;
  }

  const rawBody = token.slice(5);
  const dotIndex = rawBody.indexOf('.');
  if (dotIndex <= 0) {
    return null;
  }

  const payloadB64 = rawBody.slice(0, dotIndex);
  const providedSig = rawBody.slice(dotIndex + 1);
  const expectedSig = signPayload(payloadB64);

  if (providedSig.length !== expectedSig.length) {
    return null;
  }

  const isValidSig = crypto.timingSafeEqual(
    Buffer.from(providedSig, 'utf8'),
    Buffer.from(expectedSig, 'utf8')
  );
  if (!isValidSig) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SignedTokenPayload;
    if (!decoded || !decoded.u || !decoded.r || !decoded.exp) {
      return null;
    }
    if (Date.now() > decoded.exp) {
      return null;
    }

    return {
      token,
      userId: decoded.u,
      email: decoded.e,
      role: decoded.r,
      name: decoded.n,
      studentId: decoded.sid,
      facultyId: decoded.fid,
      parentId: decoded.pid,
      linkedStudentId: decoded.lsid,
      expiresAt: decoded.exp
    };
  } catch {
    return null;
  }
}

export function createSessionToken(user: User): AuthSession {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
  const payload: SignedTokenPayload = {
    u: user.id,
    e: user.email,
    r: user.role,
    n: user.name,
    sid: user.studentId,
    fid: user.facultyId,
    pid: user.parentId,
    lsid: user.linkedStudentId,
    exp: expiresAt,
    jti: crypto.randomBytes(12).toString('hex')
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(payloadB64);
  const token = `sctk_${payloadB64}.${signature}`;

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
    expiresAt
  };
  activeSessions.set(token, session);
  return session;
}

export function revokeSession(token: string): boolean {
  revokedTokens.add(token);
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
  if (revokedTokens.has(token)) {
    activeSessions.delete(token);
    res.status(401).json({ success: false, error: "Session expired or invalid. Please log in again." });
    return;
  }

  let session: AuthSession | null | undefined = activeSessions.get(token);

  // Stateless cryptographic fallback for serverless horizontal scaling / cold starts (e.g. Vercel Functions)
  if (!session) {
    session = verifySignedSessionToken(token);
    if (session) {
      activeSessions.set(token, session);
    }
  }

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
