import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/auth.routes.js';
import attendanceRoutes from './server/routes/attendance.routes.js';
import studentRoutes from './server/routes/student.routes.js';
import facultyRoutes from './server/routes/faculty.routes.js';
import parentRoutes from './server/routes/parent.routes.js';
import admissionRoutes from './server/routes/admission.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import qrRoutes from './server/routes/qr.routes.js';
import { db } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  // JSON Body Parser with reasonable limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS / Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health-check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'HEALTHY',
      service: 'Smart Campus Enterprise ERP & BLE Attendance Platform',
      version: '2.4.0',
      timestamp: new Date().toISOString(),
      activeNodes: db.devices.filter(d => d.status === 'ONLINE').length
    });
  });

  // Public college info endpoint
  app.get('/api/public/college-info', (req, res) => {
    res.json({
      success: true,
      settings: db.settings,
      announcements: db.notifications.filter(n => n.targetRole === 'ALL'),
      publicEvents: db.events.slice(0, 3)
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/faculty', facultyRoutes);
  app.use('/api/parent', parentRoutes);
  app.use('/api/admission', admissionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/qr', qrRoutes);

  // Vite middleware in development vs static serving in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Campus Server] Listening on http://0.0.0.0:${PORT} (ENV: ${isProduction ? 'PROD' : 'DEV'})`);
  });
}

startServer().catch((err) => {
  console.error('[Smart Campus Server Error]', err);
  process.exit(1);
});
