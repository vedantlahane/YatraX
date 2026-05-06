import type { Request, Response, NextFunction } from 'express';
import { advisoryService } from './advisory.service.js';

export const advisoryController = {
  async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ ok: true, data: await advisoryService.listAll() });
    } catch (e) { next(e); }
  },

  async listActive(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ ok: true, data: await advisoryService.listActive() });
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ ok: true, data: await advisoryService.getById(Number(req.params['id'])) });
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await advisoryService.create(req.body, req.user!.sub);
      res.status(201).json({ ok: true, data });
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await advisoryService.update(Number(req.params['id']), req.body, req.user!.sub);
      res.json({ ok: true, data });
    } catch (e) { next(e); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await advisoryService.remove(Number(req.params['id']), req.user!.sub));
    } catch (e) { next(e); }
  },
};
