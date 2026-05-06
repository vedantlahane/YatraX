//backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/index.js';
import { errorHandler } from './shared/http/middleware/error-handler.js';
import authRoutes from './modules/auth/auth.routes.js';
import { touristSelfRouter, touristAdminRouter } from './modules/tourist/tourist.routes.js';
import { alertActionRouter, alertAdminRouter } from './modules/alert/alert.routes.js';
import { riskZonePublicRouter, riskZoneAdminRouter } from './modules/risk-zone/risk-zone.routes.js';
import safetyRoutes from './modules/safety/safety.routes.js';
import { adminAuthRouter, policePublicRouter, policeAdminRouter } from './modules/police/police.routes.js';
import { hospitalPublicRouter, hospitalAdminRouter } from './modules/hospital/hospital.routes.js';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'gateway', uptime: process.uptime() });
  });

  // modules will be mounted here, e.g.:
  app.use('/api/auth', authRoutes);
  app.use('/api/tourists', touristSelfRouter);
  app.use('/api/admin/tourists', touristAdminRouter);
  app.use('/api/action', alertActionRouter);
  app.use('/api/admin/alerts', alertAdminRouter);
  app.use('/api/risk-zones', riskZonePublicRouter);
  app.use('/api/admin/risk-zones', riskZoneAdminRouter);
  app.use('/api/v1/safety', safetyRoutes);
  app.use('/api/admin', adminAuthRouter);
  app.use('/api/police-stations', policePublicRouter);
  app.use('/api/admin/police', policeAdminRouter);
  app.use('/api/hospitals', hospitalPublicRouter);
  app.use('/api/admin/hospitals', hospitalAdminRouter);

  app.use(errorHandler);
  return app;
}