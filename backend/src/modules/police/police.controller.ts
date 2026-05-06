import type { Request, Response } from 'express';
import { policeService } from './police.service.js';
import type {
  PoliceLoginInput,
  CreatePoliceInput,
  UpdatePoliceInput,
  PoliceIdParam,
} from './police.schema.ts';

export const policeController = {
  async login(req: Request, res: Response): Promise<void> {
    const result = await policeService.login(req.body as PoliceLoginInput);
    res.json({ ok: true, ...result });
  },

  async list(req: Request, res: Response): Promise<void> {
    const search = (req.query.search as string | undefined)?.trim() || undefined;
    const departments = await policeService.list(search);
    res.json({ ok: true, departments });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as PoliceIdParam;
    const department = await policeService.getById(id);
    res.json({ ok: true, department });
  },

  async create(req: Request, res: Response): Promise<void> {
    const department = await policeService.create(req.body as CreatePoliceInput);
    res.status(201).json({ ok: true, department });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as PoliceIdParam;
    const department = await policeService.update(id, req.body as UpdatePoliceInput);
    res.json({ ok: true, department });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as PoliceIdParam;
    const result = await policeService.remove(id);
    res.json({ ok: true, ...result });
  },

  async listPublicStations(_req: Request, res: Response): Promise<void> {
    const departments = await policeService.list();
    res.json({ ok: true, departments });
  },
};
