import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { dashboardController } from './dashboard.controller.js';

export const dashboardAdminRouter = Router();
export const dashboardTouristRouter = Router();

// GET /api/admin/dashboard/state
dashboardAdminRouter.get('/state', requireAuth, requireRole('admin'), dashboardController.admin);

// GET /api/admin/dashboard/tourist/:touristId
dashboardAdminRouter.get(
  '/tourist/:touristId',
  requireAuth,
  requireRole('admin'),
  dashboardController.tourist,
);

// GET /api/dashboard  (own dashboard)
dashboardTouristRouter.get('/', requireAuth, dashboardController.tourist);
