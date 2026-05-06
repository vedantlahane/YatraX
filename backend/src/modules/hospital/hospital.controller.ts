import type { Request, Response } from 'express';
import { hospitalService } from './hospital.service.js';
import type {
  CreateHospitalInput,
  UpdateHospitalInput,
  HospitalIdParam,
  HospitalNearbyQuery,
} from './hospital.schema.ts';

export const hospitalController = {
  async list(req: Request, res: Response): Promise<void> {
    const search = (req.query.search as string | undefined)?.trim() || undefined;
    const hospitals = await hospitalService.list(search);
    res.json({ ok: true, hospitals });
  },

  async listAll(req: Request, res: Response): Promise<void> {
    const search = (req.query.search as string | undefined)?.trim() || undefined;
    const hospitals = await hospitalService.listAll(search);
    res.json({ ok: true, hospitals });
  },

  async nearby(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as HospitalNearbyQuery;
    const hospitals = await hospitalService.nearby(query.latitude, query.longitude, query.radiusKm);
    res.json({ ok: true, hospitals });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as HospitalIdParam;
    const hospital = await hospitalService.getById(Number(id));
    res.json({ ok: true, hospital });
  },

  async create(req: Request, res: Response): Promise<void> {
    const hospital = await hospitalService.create(req.body as CreateHospitalInput);
    res.status(201).json({ ok: true, hospital });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as HospitalIdParam;
    const hospital = await hospitalService.update(Number(id), req.body as UpdateHospitalInput);
    res.json({ ok: true, hospital });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = req.params as unknown as HospitalIdParam;
    const result = await hospitalService.remove(Number(id));
    res.json({ ok: true, ...result });
  },
};
