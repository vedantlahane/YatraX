import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { authLimiter, generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { policeController } from './police.controller.js';
import {
  PoliceLoginSchema,
  CreatePoliceSchema,
  UpdatePoliceSchema,
  PoliceIdParamSchema,
} from './police.schema.js';

export const adminAuthRouter: Router = Router();

adminAuthRouter.post(
  '/login',
  authLimiter,
  validate(PoliceLoginSchema),
  policeController.login,
);

export const policePublicRouter: Router = Router();

policePublicRouter.get('/', generalLimiter, policeController.listPublicStations);

export const policeAdminRouter: Router = Router();
policeAdminRouter.use(requireAuth, requireRole('admin'));

policeAdminRouter.get('/', policeController.list);

policeAdminRouter.post('/', validate(CreatePoliceSchema), policeController.create);

policeAdminRouter.get(
  '/:id',
  validate(PoliceIdParamSchema, 'params'),
  policeController.getById,
);

policeAdminRouter.patch(
  '/:id',
  validate(PoliceIdParamSchema, 'params'),
  validate(UpdatePoliceSchema),
  policeController.update,
);

policeAdminRouter.delete(
  '/:id',
  validate(PoliceIdParamSchema, 'params'),
  policeController.remove,
);
