import { AppError } from '../../shared/http/errors.js';
import { wsHub } from '../../shared/ws/hub.js';
import { advisoryRepo } from './advisory.repo.js';
import { auditService } from '../audit/audit.service.js';
import type { CreateAdvisoryInput, UpdateAdvisoryInput } from './advisory.schema.js';
import type { TravelAdvisory } from '../../shared/db/schema.js';

function toView(a: TravelAdvisory) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    affectedArea: a.affectedArea,
    source: a.source,
    active: a.active,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export const advisoryService = {
  async listAll() {
    const items = await advisoryRepo.listAll();
    return items.map(toView);
  },

  async listActive() {
    const items = await advisoryRepo.listActive();
    return items.map(toView);
  },

  async getById(id: number) {
    const item = await advisoryRepo.findById(id);
    if (!item) throw new AppError('NOT_FOUND', 'Advisory not found');
    return toView(item);
  },

  async create(input: CreateAdvisoryInput, actorId: string) {
    const item = await advisoryRepo.create({
      title: input.title,
      body: input.body,
      severity: input.severity,
      affectedArea: input.affectedArea ?? null,
      source: input.source ?? 'admin',
      active: true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });

    wsHub.toRoom('admin', {
      type: 'ADVISORY_CREATED',
      payload: { advisoryId: item.id, title: item.title, severity: item.severity },
    });

    await auditService.write({
      actor: actorId,
      action: 'create_advisory',
      targetCollection: 'travel_advisories',
      targetId: String(item.id),
      changes: input,
    });

    return toView(item);
  },

  async update(id: number, input: UpdateAdvisoryInput, actorId: string) {
    const existing = await advisoryRepo.findById(id);
    if (!existing) throw new AppError('NOT_FOUND', 'Advisory not found');

    const patch: Parameters<typeof advisoryRepo.update>[1] = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.body !== undefined) patch.body = input.body;
    if (input.severity !== undefined) patch.severity = input.severity;
    if (input.affectedArea !== undefined) patch.affectedArea = input.affectedArea;
    if (input.active !== undefined) patch.active = input.active;
    if (input.expiresAt !== undefined) patch.expiresAt = new Date(input.expiresAt);

    const updated = await advisoryRepo.update(id, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'Advisory not found');

    await auditService.write({
      actor: actorId,
      action: 'update_advisory',
      targetCollection: 'travel_advisories',
      targetId: String(id),
      changes: input,
    });

    return toView(updated);
  },

  async remove(id: number, actorId: string) {
    const row = await advisoryRepo.remove(id);
    if (!row) throw new AppError('NOT_FOUND', 'Advisory not found');

    await auditService.write({
      actor: actorId,
      action: 'delete_advisory',
      targetCollection: 'travel_advisories',
      targetId: String(id),
    });

    return { deleted: true };
  },
};
