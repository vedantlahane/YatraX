import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { hospitalController } from './hospital.controller.js';
import {
  CreateHospitalSchema,
  UpdateHospitalSchema,
  HospitalIdParamSchema,
  HospitalNearbyQuerySchema,
} from './hospital.schema.js';

export const hospitalPublicRouter: Router = Router();

hospitalPublicRouter.get('/', generalLimiter, hospitalController.list);

hospitalPublicRouter.get(
  '/nearby',
  generalLimiter,
  validate(HospitalNearbyQuerySchema, 'query'),
  hospitalController.nearby,
);

hospitalPublicRouter.get('/:id', generalLimiter, validate(HospitalIdParamSchema, 'params'), hospitalController.getById);

export const hospitalAdminRouter: Router = Router();

hospitalAdminRouter.use(requireAuth, requireRole('admin'));

hospitalAdminRouter.get('/', hospitalController.listAll);

hospitalAdminRouter.post('/', validate(CreateHospitalSchema), hospitalController.create);

hospitalAdminRouter.get('/:id', validate(HospitalIdParamSchema, 'params'), hospitalController.getById);

hospitalAdminRouter.patch(
  '/:id',
  validate(HospitalIdParamSchema, 'params'),
  validate(UpdateHospitalSchema),
  hospitalController.update,
);

hospitalAdminRouter.delete('/:id', validate(HospitalIdParamSchema, 'params'), hospitalController.remove);
