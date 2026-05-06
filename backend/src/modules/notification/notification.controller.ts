import type { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';

export const notificationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const touristId = req.user!.sub;
      const items = await notificationService.list(touristId);
      res.json({ ok: true, data: items });
    } catch (e) { next(e); }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const touristId = req.user!.sub;
      const id = Number(req.params['notifId']);
      const result = await notificationService.markRead(id, touristId);
      res.json(result);
    } catch (e) { next(e); }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const touristId = req.user!.sub;
      const result = await notificationService.markAllRead(touristId);
      res.json(result);
    } catch (e) { next(e); }
  },
};
