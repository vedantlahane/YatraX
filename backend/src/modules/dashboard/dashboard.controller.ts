import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async admin(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ ok: true, data: await dashboardService.adminDashboard() });
    } catch (e) { next(e); }
  },

  async tourist(req: Request, res: Response, next: NextFunction) {
    try {
      // Admins can view any tourist's dashboard via /:touristId param
      // Tourists can only see their own
      let touristId: string;
      if (req.user?.role === 'admin') {
        touristId = (req.params['touristId'] as string | undefined) ?? req.user.sub;
      } else {
        touristId = req.user!.sub;
      }
      res.json({ ok: true, data: await dashboardService.touristDashboard(touristId) });
    } catch (e) { next(e); }
  },
};
