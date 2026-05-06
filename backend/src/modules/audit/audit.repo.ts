import { db } from '../../shared/db/client.js';
import { auditLogs } from '../../shared/db/schema.js';
import { eq, desc, and, SQL } from 'drizzle-orm';
import type { NewAuditLog } from '../../shared/db/schema.js';

export const auditRepo = {
  async create(data: Omit<NewAuditLog, 'id' | 'timestamp'>) {
    const [row] = await db.insert(auditLogs).values(data).returning();
    return row!;
  },

  async paginate(opts: {
    page: number;
    limit: number;
    actor?: string;
    action?: string;
    targetCollection?: string;
  }) {
    const { page, limit, actor, action, targetCollection } = opts;
    const conditions: SQL[] = [];
    if (actor) conditions.push(eq(auditLogs.actor, actor));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (targetCollection) conditions.push(eq(auditLogs.targetCollection, targetCollection));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db.$count(auditLogs, where),
    ]);

    return { items, total: Number(countResult) };
  },
};
