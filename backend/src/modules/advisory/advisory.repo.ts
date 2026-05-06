import { db } from '../../shared/db/client.js';
import { travelAdvisories } from '../../shared/db/schema.js';
import { eq, and, desc, gte, or, isNull } from 'drizzle-orm';
import type { NewTravelAdvisory } from '../../shared/db/schema.js';

export const advisoryRepo = {
  async listAll() {
    return db.select().from(travelAdvisories).orderBy(desc(travelAdvisories.createdAt));
  },

  async listActive() {
    const now = new Date();
    return db
      .select()
      .from(travelAdvisories)
      .where(
        and(
          eq(travelAdvisories.active, true),
          or(isNull(travelAdvisories.expiresAt), gte(travelAdvisories.expiresAt, now)),
        ),
      )
      .orderBy(desc(travelAdvisories.createdAt));
  },

  async findById(id: number) {
    const [row] = await db.select().from(travelAdvisories).where(eq(travelAdvisories.id, id));
    return row ?? null;
  },

  async create(data: Omit<NewTravelAdvisory, 'id' | 'createdAt' | 'updatedAt'>) {
    const [row] = await db.insert(travelAdvisories).values(data).returning();
    return row!;
  },

  async update(id: number, data: Partial<NewTravelAdvisory>) {
    const [row] = await db
      .update(travelAdvisories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(travelAdvisories.id, id))
      .returning();
    return row ?? null;
  },

  async remove(id: number) {
    const [row] = await db
      .delete(travelAdvisories)
      .where(eq(travelAdvisories.id, id))
      .returning({ id: travelAdvisories.id });
    return row ?? null;
  },
};
