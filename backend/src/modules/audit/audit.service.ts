import { auditRepo } from './audit.repo.js';

interface WriteOpts {
  actor: string;
  actorType?: 'admin' | 'system';
  action: string;
  targetCollection: string;
  targetId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  /** Fire-and-forget safe — catches errors so a failing audit write never breaks the caller. */
  write(opts: WriteOpts): Promise<void> {
    return auditRepo
      .create({
        actor: opts.actor,
        actorType: opts.actorType ?? 'admin',
        action: opts.action,
        targetCollection: opts.targetCollection,
        targetId: opts.targetId,
        changes: opts.changes ?? null,
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
      })
      .then(() => undefined)
      .catch(() => undefined); // never throw
  },

  async paginate(opts: {
    page: number;
    limit: number;
    actor?: string;
    action?: string;
    targetCollection?: string;
  }) {
    const { items, total } = await auditRepo.paginate(opts);
    const pages = Math.max(1, Math.ceil(total / opts.limit));
    return {
      items: items.map((l) => ({
        id: l.id,
        actor: l.actor,
        actorType: l.actorType,
        action: l.action,
        targetCollection: l.targetCollection,
        targetId: l.targetId,
        changes: l.changes,
        ipAddress: l.ipAddress,
        timestamp: l.timestamp.toISOString(),
      })),
      total,
      page: opts.page,
      pages,
    };
  },
};
