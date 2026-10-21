import cors from 'cors';
import express from 'express';
import { getCorsOrigins } from './strava/config';
import { healthRouter } from './routes/health';
import { stravaRouter } from './routes/strava';

export function createApp() {
  const app = express();
  app.use(cors({ origin: getCorsOrigins() }));
  app.use(express.json());
  app.use(healthRouter);
  app.use(stravaRouter);
  return app;
}
