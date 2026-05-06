import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { riskZoneController } from './risk-zone.controller.js';
import {
  CreateRiskZoneSchema,
  UpdateRiskZoneSchema,
  ZoneIdParamSchema,
  ToggleStatusBodySchema,
  BulkStatusSchema,
  NearbyQuerySchema,
} from './risk-zone.schema.js';

export const riskZonePublicRouter: Router = Router();

riskZonePublicRouter.get('/active', generalLimiter, riskZoneController.listActivePublic);

riskZonePublicRouter.get(
  '/nearby',
  generalLimiter,
  validate(NearbyQuerySchema, 'query'),
  riskZoneController.nearbyPublic,
);

export const riskZoneAdminRouter: Router = Router();

riskZoneAdminRouter.use(requireAuth, requireRole('admin'));

riskZoneAdminRouter.get('/', riskZoneController.list);
riskZoneAdminRouter.get('/active', riskZoneController.listActive);
riskZoneAdminRouter.get('/stats', riskZoneController.stats);

riskZoneAdminRouter.post('/', validate(CreateRiskZoneSchema), riskZoneController.create);

riskZoneAdminRouter.post('/bulk-status', validate(BulkStatusSchema), riskZoneController.bulkStatus);

riskZoneAdminRouter.get('/:zoneId', validate(ZoneIdParamSchema, 'params'), riskZoneController.getById);

riskZoneAdminRouter.patch(
  '/:zoneId',
  validate(ZoneIdParamSchema, 'params'),
  validate(UpdateRiskZoneSchema),
  riskZoneController.update,
);

riskZoneAdminRouter.patch(
  '/:zoneId/status',
  validate(ZoneIdParamSchema, 'params'),
  validate(ToggleStatusBodySchema),
  riskZoneController.toggleStatus,
);

riskZoneAdminRouter.delete('/:zoneId', validate(ZoneIdParamSchema, 'params'), riskZoneController.remove);
