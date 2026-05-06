import { db } from '../../shared/db/client.js';
import { notifications } from '../../shared/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { NewNotification } from '../../shared/db/schema.js';

export const notificationRepo = {
  async listByTourist(touristId: string) {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.touristId, touristId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  },

  async markRead(id: number, touristId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.touristId, touristId)))
      .returning();
    return updated ?? null;
  },

  async markAllRead(touristId: string) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.touristId, touristId), eq(notifications.read, false)));
  },

  async create(data: Omit<NewNotification, 'id' | 'createdAt'>) {
    const [row] = await db.insert(notifications).values(data).returning();
    return row!;
  },
};
