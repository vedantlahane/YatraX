import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { sosLimiter, locationLimiter, generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { alertController } from './alert.controller.js';
import {
  TouristIdParamSchema,
  AlertIdParamSchema,
  LocationUpdateSchema,
  SosSchema,
  PreAlertSchema,
  UpdateStatusSchema,
  ListAlertsQuerySchema,
} from './alert.schema.js';

export const alertActionRouter: Router = Router();
alertActionRouter.use(requireAuth);

alertActionRouter.post(
  '/location/:touristId',
  locationLimiter,
  validate(TouristIdParamSchema, 'params'),
  validate(LocationUpdateSchema),
  alertController.postLocation,
);

alertActionRouter.post(
  '/sos/:touristId',
  sosLimiter,
  validate(TouristIdParamSchema, 'params'),
  validate(SosSchema),
  alertController.postSos,
);

alertActionRouter.post(
  '/sos/:touristId/pre-alert',
  sosLimiter,
  validate(TouristIdParamSchema, 'params'),
  validate(PreAlertSchema),
  alertController.postPreAlert,
);

alertActionRouter.post(
  '/sos/:alertId/cancel',
  generalLimiter,
  validate(AlertIdParamSchema, 'params'),
  alertController.cancelAlert,
);

alertActionRouter.get(
  '/sos/:alertId/status',
  generalLimiter,
  validate(AlertIdParamSchema, 'params'),
  alertController.getStatus,
);

alertActionRouter.get(
  '/tourist/:touristId/alerts',
  generalLimiter,
  validate(TouristIdParamSchema, 'params'),
  alertController.listMyAlerts,
);

export const alertAdminRouter: Router = Router();
alertAdminRouter.use(requireAuth, requireRole('admin'));

alertAdminRouter.get('/', validate(ListAlertsQuerySchema, 'query'), alertController.adminListActive);

alertAdminRouter.get('/all', validate(ListAlertsQuerySchema, 'query'), alertController.adminListAll);

alertAdminRouter.post(
  '/:alertId/status',
  validate(AlertIdParamSchema, 'params'),
  validate(UpdateStatusSchema),
  alertController.adminUpdateStatus,
);
