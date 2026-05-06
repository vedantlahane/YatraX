import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { auditController } from './audit.controller.js';

const router = Router();

// GET /api/admin/audit-logs
router.get('/', requireAuth, requireRole('admin'), auditController.list);

export default router;
