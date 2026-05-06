import type { Request, Response, NextFunction } from 'express';
import { broadcastService } from './broadcast.service.js';

export const broadcastController = {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await broadcastService.send(req.body, req.user!.sub, req.ip);
      res.json(result);
    } catch (e) { next(e); }
  },
};
