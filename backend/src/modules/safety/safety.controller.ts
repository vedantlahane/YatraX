import type { Request, Response } from 'express';
import { safetyService } from './safety.service.js';
import type { SafetyCheckQuery } from './safety.schema.ts';

export const safetyController = {
  async check(req: Request, res: Response): Promise<void> {
    const data = await safetyService.check(req.query as unknown as SafetyCheckQuery);
    res.json({ ok: true, data });
  },
};
