import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth, requireRole } from '../../shared/http/middleware/auth.js';
import { generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { touristController } from './tourist.controller.js';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
  TouristIdParamSchema,
  ListTouristsQuerySchema,
} from './tourist.schema.js';

export const touristSelfRouter: Router = Router();

touristSelfRouter.get('/me', requireAuth, touristController.getMe);

touristSelfRouter.patch(
  '/me',
  requireAuth,
  generalLimiter,
  validate(UpdateProfileSchema),
  touristController.updateMe,
);

touristSelfRouter.post(
  '/me/password',
  requireAuth,
  generalLimiter,
  validate(ChangePasswordSchema),
  touristController.changePassword,
);

export const touristAdminRouter: Router = Router();

touristAdminRouter.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(ListTouristsQuerySchema, 'query'),
  touristController.list,
);

touristAdminRouter.get(
  '/:touristId',
  requireAuth,
  requireRole('admin'),
  validate(TouristIdParamSchema, 'params'),
  touristController.getById,
);
