import type { Request, Response } from 'express';
import { AppError } from '../../shared/http/errors.js';
import { alertService } from './alert.service.js';
import type {
  TouristIdParam,
  AlertIdParam,
  LocationUpdateInput,
  SosInput,
  PreAlertInput,
  UpdateStatusInput,
  ListAlertsQuery,
} from './alert.schema.js';

function ensureSelfOrAdmin(req: Request, touristId: string): void {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  if (req.user.role === 'admin') return;
  if (req.user.sub !== touristId) throw new AppError('FORBIDDEN', 'Cannot act on behalf of another tourist');
}

export const alertController = {
  async postLocation(req: Request, res: Response): Promise<void> {
    const { touristId } = req.params as unknown as TouristIdParam;
    ensureSelfOrAdmin(req, touristId);
    const result = await alertService.ingestLocation(touristId, req.body as LocationUpdateInput);
    res.json({ ok: true, ...result });
  },

  async postSos(req: Request, res: Response): Promise<void> {
    const { touristId } = req.params as unknown as TouristIdParam;
    ensureSelfOrAdmin(req, touristId);
    const result = await alertService.createSos(touristId, req.body as SosInput);
    res.status(201).json({ ok: true, ...result });
  },

  async postPreAlert(req: Request, res: Response): Promise<void> {
    const { touristId } = req.params as unknown as TouristIdParam;
    ensureSelfOrAdmin(req, touristId);
    const result = await alertService.createPreAlert(touristId, req.body as PreAlertInput);
    res.status(201).json({ ok: true, ...result });
  },

  async cancelAlert(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params as unknown as AlertIdParam;
    const updated = await alertService.cancelAlert(alertId);
    res.json({ ok: true, alert: updated });
  },

  async getStatus(req: Request, res: Response): Promise<void> {
    const { alertId } = req.params as unknown as AlertIdParam;
    const status = await alertService.getStatus(alertId);
    res.json({ ok: true, ...status });
  },

  async listMyAlerts(req: Request, res: Response): Promise<void> {
    const { touristId } = req.params as unknown as TouristIdParam;
    ensureSelfOrAdmin(req, touristId);
    const alerts = await alertService.listForTourist(touristId);
    res.json({ ok: true, alerts });
  },

  async adminListActive(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as ListAlertsQuery;
    const result = await alertService.listActive(q.page, q.limit);
    res.json({ ok: true, ...result });
  },

  async adminListAll(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as ListAlertsQuery;
    const result = await alertService.listAll(q.page, q.limit);
    res.json({ ok: true, ...result });
  },

  async adminUpdateStatus(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
    const { alertId } = req.params as unknown as AlertIdParam;
    const { status } = req.body as UpdateStatusInput;
    const updated = await alertService.updateStatus(alertId, status, req.user.sub);
    res.json({ ok: true, alert: updated });
  },
};
