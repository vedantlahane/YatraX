import type { Request, Response } from 'express';
import { AppError } from '../../shared/http/errors.js';
import { touristService } from './tourist.service.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  TouristIdParam,
  ListTouristsQuery,
} from './tourist.schema.ts';

export const touristController = {
  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
    const user = await touristService.getProfile(req.user.sub);
    res.json({ ok: true, user });
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
    const user = await touristService.updateProfile(req.user.sub, req.body as UpdateProfileInput);
    res.json({ ok: true, user });
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
    const result = await touristService.changePassword(req.user.sub, req.body as ChangePasswordInput);
    res.json({ ok: true, ...result });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { touristId } = req.params as unknown as TouristIdParam;
    const user = await touristService.getById(touristId);
    res.json({ ok: true, user });
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListTouristsQuery;
    const result = await touristService.list(query);
    res.json({ ok: true, ...result });
  },
};
