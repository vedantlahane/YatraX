import { Router } from 'express';
import { validate } from '../../shared/http/middleware/validate.js';
import { generalLimiter } from '../../shared/http/middleware/rate-limit.js';
import { safetyController } from './safety.controller.js';
import { SafetyCheckQuerySchema } from './safety.schema.js';

const router: Router = Router();

router.get(
  '/check',
  generalLimiter,
  validate(SafetyCheckQuerySchema, 'query'),
  safetyController.check,
);

export default router;
