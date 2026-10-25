import express from 'express';
import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import studentRoutes from './routes/student.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import parentRoutes from './routes/parent.routes.js';
import admissionRoutes from './routes/admission.routes.js';
import adminRoutes from './routes/admin.routes.js';
import qrRoutes from './routes/qr.routes.js';
import { db } from './db.js';

export interface CreateAppOptions {
  mountRootFallback?: boolean;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.set('trust proxy', 1);

  // JSON & URL-encoded body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS & security headers (supports both same-origin Vercel/Node and separate API deployments)
  app.use((req, res, next) => {
    const configuredOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    const requestOrigin = req.headers.origin;

    if (requestOrigin) {
      if (configuredOrigins.length === 0 || configuredOrigins.includes('*') || configuredOrigins.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  const apiRouter = express.Router();

  const sendHealth = (_req: express.Request, res: express.Response) => {
    res.json({
      ok: true,
      status: 'HEALTHY',
      service: 'Smart Campus Enterprise ERP & BLE Attendance Platform',
      version: '2.4.0',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      timestamp: new Date().toISOString(),
      activeNodes: db.devices.filter(d => d.status === 'ONLINE').length
    });
  };

  // Root /api and /api/health safe health-check endpoints
  apiRouter.get('/', sendHealth);
  apiRouter.get('/health', sendHealth);

  // Public college info endpoint
  apiRouter.get('/public/college-info', (_req, res) => {
    res.json({
      success: true,
      settings: db.settings,
      announcements: db.notifications.filter(n => n.targetRole === 'ALL'),
      publicEvents: db.events.slice(0, 3)
    });
  });

  // Mount role & domain routers
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/attendance', attendanceRoutes);
  apiRouter.use('/student', studentRoutes);
  apiRouter.use('/faculty', facultyRoutes);
  apiRouter.use('/parent', parentRoutes);
  apiRouter.use('/admission', admissionRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/qr', qrRoutes);

  // Structured JSON 404 for unmatched API routes
  apiRouter.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  app.use('/api', apiRouter);

  // When mounted inside Vercel Serverless (/api/index.js), handle both /api/* and stripped /* paths
  if (options.mountRootFallback || process.env.VERCEL) {
    app.use('/', apiRouter);
  }

  return app;
}

export const app = createApp();
export default app;
