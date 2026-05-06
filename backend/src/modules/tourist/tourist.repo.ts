import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { tourists, type Tourist, type NewTourist } from '../../shared/db/schema.js';

export const touristRepo = {
  async findById(id: string): Promise<Tourist | undefined> {
    const [row] = await db.select().from(tourists).where(eq(tourists.id, id)).limit(1);
    return row;
  },

  async updateById(id: string, patch: Partial<NewTourist>): Promise<Tourist | undefined> {
    const [row] = await db
      .update(tourists)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tourists.id, id))
      .returning();
    return row;
  },

  async list(opts: { page: number; limit: number; search?: string }): Promise<{
    items: Tourist[];
    total: number;
  }> {
    const offset = (opts.page - 1) * opts.limit;

    const where = opts.search
      ? or(
          ilike(tourists.name, `%${opts.search}%`),
          ilike(tourists.email, `%${opts.search}%`),
          ilike(tourists.phone, `%${opts.search}%`),
        )
      : undefined;

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(tourists)
        .where(where ? and(where) : undefined)
        .orderBy(desc(tourists.createdAt), asc(tourists.id))
        .limit(opts.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tourists)
        .where(where ? and(where) : undefined),
    ]);

    return { items, total: totalRow[0]?.count ?? 0 };
  },
};
