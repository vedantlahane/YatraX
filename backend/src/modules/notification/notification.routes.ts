import { Router } from 'express';
import { requireAuth } from '../../shared/http/middleware/auth.js';
import { notificationController } from './notification.controller.js';

const router = Router();

// GET  /api/notifications         → list my notifications
router.get('/', requireAuth, notificationController.list);

// POST /api/notifications/:notifId/read
router.post('/:notifId/read', requireAuth, notificationController.markRead);

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, notificationController.markAllRead);

export default router;
