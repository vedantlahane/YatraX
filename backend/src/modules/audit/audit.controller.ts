import type { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service.js';

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query['page']) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query['limit']) || 50));
      const actor = req.query['actor'] as string | undefined;
      const action = req.query['action'] as string | undefined;
      const targetCollection = req.query['targetCollection'] as string | undefined;

      const result = await auditService.paginate({
        page,
        limit,
        ...(actor !== undefined ? { actor } : {}),
        ...(action !== undefined ? { action } : {}),
        ...(targetCollection !== undefined ? { targetCollection } : {}),
      });
      res.json({ ok: true, ...result });
    } catch (e) { next(e); }
  },
};
