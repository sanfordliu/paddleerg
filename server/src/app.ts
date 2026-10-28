import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { getCorsOrigins } from './strava/config';
import { healthRouter } from './routes/health';
import { stravaRouter } from './routes/strava';

function resolveStaticDir(): string | null {
  const fromEnv = process.env.STATIC_DIR?.trim();
  const candidates = [
    fromEnv,
    path.join(__dirname, '../public'),
    path.join(process.cwd(), 'public'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: getCorsOrigins() }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(stravaRouter);

  const staticDir = resolveStaticDir();
  if (staticDir) {
    app.use(express.static(staticDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      // API routes only — do not match SPA paths like /strava-callback.
      if (req.path === '/health' || req.path.startsWith('/strava/')) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  return app;
}
