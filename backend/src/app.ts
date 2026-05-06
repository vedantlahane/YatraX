//backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/index.js';
import { errorHandler } from './shared/http/middleware/error-handler.js';

// Existing modules
import authRoutes from './modules/auth/auth.routes.js';
import { touristSelfRouter, touristAdminRouter } from './modules/tourist/tourist.routes.js';
import { alertActionRouter, alertAdminRouter } from './modules/alert/alert.routes.js';
import { riskZonePublicRouter, riskZoneAdminRouter } from './modules/risk-zone/risk-zone.routes.js';
import safetyRoutes from './modules/safety/safety.routes.js';
import { adminAuthRouter, policePublicRouter, policeAdminRouter } from './modules/police/police.routes.js';
import { hospitalPublicRouter, hospitalAdminRouter } from './modules/hospital/hospital.routes.js';

// New modules
import notificationRoutes from './modules/notification/notification.routes.js';
import { advisoryPublicRouter, advisoryAdminRouter } from './modules/advisory/advisory.routes.js';
import broadcastRoutes from './modules/broadcast/broadcast.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import { dashboardAdminRouter, dashboardTouristRouter } from './modules/dashboard/dashboard.routes.js';

export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'yatrax-gateway', uptime: process.uptime() });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);

  // ── Tourist ───────────────────────────────────────────────────────────────
  app.use('/api/tourists', touristSelfRouter);
  app.use('/api/admin/tourists', touristAdminRouter);

  // ── Alert / SOS / Location ────────────────────────────────────────────────
  app.use('/api/action', alertActionRouter);
  app.use('/api/admin/alerts', alertAdminRouter);

  // ── Risk Zones ────────────────────────────────────────────────────────────
  app.use('/api/risk-zones', riskZonePublicRouter);
  app.use('/api/admin/risk-zones', riskZoneAdminRouter);

  // ── Safety Check ──────────────────────────────────────────────────────────
  app.use('/api/v1/safety', safetyRoutes);

  // ── Police ────────────────────────────────────────────────────────────────
  app.use('/api/admin', adminAuthRouter);
  app.use('/api/police-stations', policePublicRouter);
  app.use('/api/admin/police', policeAdminRouter);

  // ── Hospitals ─────────────────────────────────────────────────────────────
  app.use('/api/hospitals', hospitalPublicRouter);
  app.use('/api/admin/hospitals', hospitalAdminRouter);

  // ── Notifications ─────────────────────────────────────────────────────────
  app.use('/api/notifications', notificationRoutes);

  // ── Advisories ────────────────────────────────────────────────────────────
  app.use('/api/advisories', advisoryPublicRouter);
  app.use('/api/admin/advisories', advisoryAdminRouter);

  // ── Broadcast ─────────────────────────────────────────────────────────────
  app.use('/api/admin/broadcast', broadcastRoutes);

  // ── Audit Logs ────────────────────────────────────────────────────────────
  app.use('/api/admin/audit-logs', auditRoutes);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  app.use('/api/admin/dashboard', dashboardAdminRouter);
  app.use('/api/dashboard', dashboardTouristRouter);

  app.use(errorHandler);
  return app;
}