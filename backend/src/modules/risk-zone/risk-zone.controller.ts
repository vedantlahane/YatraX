import type { Request, Response } from 'express';
import { riskZoneService } from './risk-zone.service.js';
import type {
  CreateRiskZoneInput,
  UpdateRiskZoneInput,
  ZoneIdParam,
  ToggleStatusInput,
  BulkStatusInput,
  NearbyQuery,
} from './risk-zone.schema.js';

export const riskZoneController = {
  async listActivePublic(_req: Request, res: Response): Promise<void> {
    const zones = await riskZoneService.listActive();
    res.json({ ok: true, zones });
  },

  async nearbyPublic(req: Request, res: Response): Promise<void> {
    const zones = await riskZoneService.nearby(req.query as unknown as NearbyQuery);
    res.json({ ok: true, zones });
  },

  async list(_req: Request, res: Response): Promise<void> {
    const zones = await riskZoneService.listAll();
    res.json({ ok: true, zones });
  },

  async listActive(_req: Request, res: Response): Promise<void> {
    const zones = await riskZoneService.listActive();
    res.json({ ok: true, zones });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const { zoneId } = req.params as unknown as ZoneIdParam;
    const zone = await riskZoneService.getById(zoneId);
    res.json({ ok: true, zone });
  },

  async create(req: Request, res: Response): Promise<void> {
    const zone = await riskZoneService.create(req.body as CreateRiskZoneInput);
    res.status(201).json({ ok: true, zone });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { zoneId } = req.params as unknown as ZoneIdParam;
    const zone = await riskZoneService.update(zoneId, req.body as UpdateRiskZoneInput);
    res.json({ ok: true, zone });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { zoneId } = req.params as unknown as ZoneIdParam;
    const result = await riskZoneService.remove(zoneId);
    res.json({ ok: true, ...result });
  },

  async toggleStatus(req: Request, res: Response): Promise<void> {
    const { zoneId } = req.params as unknown as ZoneIdParam;
    const { active } = req.body as ToggleStatusInput;
    const zone = await riskZoneService.setActive(zoneId, active);
    res.json({ ok: true, zone });
  },

  async bulkStatus(req: Request, res: Response): Promise<void> {
    const result = await riskZoneService.bulkSetActive(req.body as BulkStatusInput);
    res.json({ ok: true, ...result });
  },

  async stats(_req: Request, res: Response): Promise<void> {
    const stats = await riskZoneService.stats();
    res.json({ ok: true, stats });
  },
};
