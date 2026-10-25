import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  let app: express.Express;

  if (!isProduction) {
    const { createApp } = await import('./server/app.js');
    app = createApp();

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const bundledServerPath = path.resolve(__dirname, 'api/_server.js');
    if (fs.existsSync(bundledServerPath)) {
      const mod = await import(pathToFileURL(bundledServerPath).href);
      app = mod.createApp();
    } else {
      const mod = await import('./server/app.js');
      app = mod.createApp();
    }

    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
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
