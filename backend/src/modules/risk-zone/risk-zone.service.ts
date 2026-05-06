import { AppError } from '../../shared/http/errors.js';
import { wsHub } from '../../shared/ws/hub.js';
import { riskZoneRepo } from './risk-zone.repo.js';
import type {
  CreateRiskZoneInput,
  UpdateRiskZoneInput,
  NearbyQuery,
  BulkStatusInput,
} from './risk-zone.schema.js';

export const riskZoneService = {
  async create(input: CreateRiskZoneInput) {
    const zone = await riskZoneRepo.create(input);
    wsHub.toRoom('admin', { type: 'ZONE_UPDATE', payload: { event: 'created', zoneId: zone.id } });
    return zone;
  },

  async listAll() {
    return riskZoneRepo.listAll();
  },

  async listActive() {
    return riskZoneRepo.listActive();
  },

  async getById(id: number) {
    const zone = await riskZoneRepo.findById(id);
    if (!zone) throw new AppError('NOT_FOUND', 'Risk zone not found');
    return zone;
  },

  async update(id: number, patch: UpdateRiskZoneInput) {
    const updated = await riskZoneRepo.update(id, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'Risk zone not found');
    wsHub.toRoom('admin', { type: 'ZONE_UPDATE', payload: { event: 'updated', zoneId: id } });
    return updated;
  },

  async remove(id: number) {
    const ok = await riskZoneRepo.remove(id);
    if (!ok) throw new AppError('NOT_FOUND', 'Risk zone not found');
    wsHub.toRoom('admin', { type: 'ZONE_UPDATE', payload: { event: 'deleted', zoneId: id } });
    return { acknowledged: true };
  },

  async setActive(id: number, active: boolean) {
    const updated = await riskZoneRepo.update(id, { active });
    if (!updated) throw new AppError('NOT_FOUND', 'Risk zone not found');
    wsHub.toRoom('admin', {
      type: 'ZONE_UPDATE',
      payload: { event: 'status_changed', zoneId: id, active },
    });
    return updated;
  },

  async bulkSetActive(input: BulkStatusInput) {
    const modified = await riskZoneRepo.bulkSetActive(input.zoneIds, input.active);
    wsHub.toRoom('admin', {
      type: 'ZONE_UPDATE',
      payload: { event: 'bulk_status_changed', count: modified, active: input.active },
    });
    return { modified };
  },

  async nearby(query: NearbyQuery) {
    return riskZoneRepo.nearby(query);
  },

  async stats() {
    return riskZoneRepo.stats();
  },
};
