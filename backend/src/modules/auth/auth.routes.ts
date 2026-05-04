//backend/src/modules/auth/auth.routes.ts

import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { requireAuth } from '../../shared/http/middleware/auth.js';
import { authLimiter } from '../../shared/http/middleware/rate-limit.js';
import { authController } from './auth.controller.js';
import {
  RegisterSchema,
  LoginSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
} from './auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), authController.register);
router.post('/login',    authLimiter, validate(LoginSchema),    authController.login);
router.get('/me',        requireAuth,                            authController.me);

router.post(
  '/password-reset/request',
  authLimiter,
  validate(PasswordResetRequestSchema),
  authController.requestPasswordReset,
);
router.post(
  '/password-reset/confirm',
  authLimiter,
  validate(PasswordResetConfirmSchema),
  authController.confirmPasswordReset,
);

export default router;