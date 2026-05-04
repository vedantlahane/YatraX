//backend/src/modules/auth/auth.repo.ts


import { eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { tourists, type Tourist, type NewTourist } from '../../shared/db/schema.js';

export const authRepo = {
  async findByEmail(email: string): Promise<Tourist | undefined> {
    const [row] = await db.select().from(tourists).where(eq(tourists.email, email)).limit(1);
    return row;
  },

  async findById(id: string): Promise<Tourist | undefined> {
    const [row] = await db.select().from(tourists).where(eq(tourists.id, id)).limit(1);
    return row;
  },

  async findByResetTokenHash(hash: string): Promise<Tourist | undefined> {
    const [row] = await db
      .select()
      .from(tourists)
      .where(eq(tourists.resetTokenHash, hash))
      .limit(1);
    return row;
  },

  async create(data: NewTourist): Promise<Tourist> {
    const [row] = await db.insert(tourists).values(data).returning();
    if (!row) throw new Error('Insert failed');
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
};