//backend/src/modules/auth/auth.controller.ts

import type { Request, Response } from 'express';

import { AppError } from '../../shared/http/errors.js';
import { authService } from './auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
} from './auth.schema.ts';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    res.status(201).json({ ok: true, ...result });
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    res.json({ ok: true, ...result });
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
    const user = await authService.me(req.user.sub);
    res.json({ ok: true, user });
  },

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const { email } = req.body as PasswordResetRequestInput;
    const result = await authService.requestPasswordReset(email);
    res.json({ ok: true, ...result });
  },

  async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    const result = await authService.confirmPasswordReset(req.body as PasswordResetConfirmInput);
    res.json({ ok: true, ...result });
  },
};