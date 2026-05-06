import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { advisoryController } from './advisory.controller.js';
import { CreateAdvisorySchema, UpdateAdvisorySchema } from './advisory.schema.js';

// Public: active advisories (authenticated tourists)
export const advisoryPublicRouter = Router();
advisoryPublicRouter.get('/current', requireAuth, advisoryController.listActive);

// Admin: full CRUD
export const advisoryAdminRouter = Router();
advisoryAdminRouter.get('/', requireAuth, requireRole('admin'), advisoryController.listAll);
advisoryAdminRouter.get('/:id', requireAuth, requireRole('admin'), advisoryController.getById);
advisoryAdminRouter.post('/', requireAuth, requireRole('admin'), validate(CreateAdvisorySchema), advisoryController.create);
advisoryAdminRouter.patch('/:id', requireAuth, requireRole('admin'), validate(UpdateAdvisorySchema), advisoryController.update);
advisoryAdminRouter.delete('/:id', requireAuth, requireRole('admin'), advisoryController.remove);
