import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { broadcastController } from './broadcast.controller.js';
import { BroadcastSchema } from './broadcast.schema.js';

const router = Router();

// POST /api/admin/broadcast
router.post('/', requireAuth, requireRole('admin'), validate(BroadcastSchema), broadcastController.send);

export default router;
