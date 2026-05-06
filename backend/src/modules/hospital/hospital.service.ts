import { AppError } from '../../shared/http/errors.js';
import { hospitalRepo } from './hospital.repo.js';
import type { CreateHospitalInput, UpdateHospitalInput } from './hospital.schema.ts';
import type { Hospital, NewHospital } from '../../shared/db/schema.js';

function toPublic(h: Hospital) {
  const { geom, ...rest } = h;
  return rest;
}

export const hospitalService = {
  async list(search?: string) {
    const { items } = await hospitalRepo.listAll({
      page: 1,
      limit: 100,
      ...(search ? { search } : {}),
      activeOnly: true,
    });
    return items.map(toPublic);
  },

  async listAll(search?: string) {
    const { items } = await hospitalRepo.listAll({
      page: 1,
      limit: 100,
      ...(search ? { search } : {}),
      activeOnly: false,
    });
    return items.map(toPublic);
  },

  async nearby(latitude: number, longitude: number, radiusKm: number) {
    const items = await hospitalRepo.listNearby(latitude, longitude, radiusKm);
    return items.map(toPublic);
  },

  async getById(id: number) {
    const hospital = await hospitalRepo.findById(id);
    if (!hospital) throw new AppError('NOT_FOUND', 'Hospital not found');
    return toPublic(hospital);
  },

  async create(input: CreateHospitalInput) {
    const created = await hospitalRepo.create(input as Omit<NewHospital, 'id' | 'createdAt' | 'updatedAt' | 'geom'>);
    return toPublic(created);
  },

  async update(id: number, input: UpdateHospitalInput) {
    const patch = input as Partial<NewHospital>;
    const updated = await hospitalRepo.update(id, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'Hospital not found');
    return toPublic(updated);
  },

  async remove(id: number) {
    const ok = await hospitalRepo.remove(id);
    if (!ok) throw new AppError('NOT_FOUND', 'Hospital not found');
    return { acknowledged: true };
  },
};
