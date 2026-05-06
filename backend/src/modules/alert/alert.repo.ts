import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import {
  alerts,
  touristLocationLogs,
  type Alert,
  type NewAlert,
  type NewTouristLocationLog,
} from '../../shared/db/schema.js';

const wkt = (lat: number, lng: number): string => `SRID=4326;POINT(${lng} ${lat})`;

export const alertRepo = {
  async create(input: Omit<NewAlert, 'id' | 'createdAt' | 'updatedAt' | 'geom'>): Promise<Alert> {
    const values: Record<string, unknown> = { ...input };
    if (input.latitude != null && input.longitude != null) {
      values.geom = sql`ST_GeogFromText(${wkt(input.latitude, input.longitude)})`;
    }
    const [row] = await db.insert(alerts).values(values as NewAlert).returning();
    if (!row) throw new Error('Insert failed');
    return row;
  },

  async findById(id: number): Promise<Alert | undefined> {
    const [row] = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return row;
  },

  async update(id: number, patch: Partial<NewAlert>): Promise<Alert | undefined> {
    const [row] = await db
      .update(alerts)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return row;
  },

  async listByStatus(opts: { statuses: string[]; page: number; limit: number }): Promise<{
    items: Alert[];
    total: number;
  }> {
    const where = inArray(alerts.status, opts.statuses);
    const offset = (opts.page - 1) * opts.limit;
    const [items, totalRow] = await Promise.all([
      db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt)).limit(opts.limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(where),
    ]);
    return { items, total: totalRow[0]?.count ?? 0 };
  },

  async listAll(opts: { page: number; limit: number }): Promise<{ items: Alert[]; total: number }> {
    const offset = (opts.page - 1) * opts.limit;
    const [items, totalRow] = await Promise.all([
      db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(opts.limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(alerts),
    ]);
    return { items, total: totalRow[0]?.count ?? 0 };
  },

  async listByTourist(touristId: string): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.touristId, touristId)).orderBy(desc(alerts.createdAt));
  },

  async listActiveNear(
    lat: number,
    lng: number,
    radiusM: number,
  ): Promise<Array<Alert & { distanceMeters: number }>> {
    const point = sql`ST_GeogFromText(${wkt(lat, lng)})`;
    const rows = await db
      .select({
        id: alerts.id,
        touristId: alerts.touristId,
        alertType: alerts.alertType,
        priority: alerts.priority,
        status: alerts.status,
        message: alerts.message,
        media: alerts.media,
        latitude: alerts.latitude,
        longitude: alerts.longitude,
        geom: alerts.geom,
        preAlertTriggered: alerts.preAlertTriggered,
        escalationLevel: alerts.escalationLevel,
        nearestStationId: alerts.nearestStationId,
        resolvedBy: alerts.resolvedBy,
        resolvedAt: alerts.resolvedAt,
        cancelledAt: alerts.cancelledAt,
        responseTimeMs: alerts.responseTimeMs,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
        distanceMeters: sql<number>`ST_Distance(${alerts.geom}, ${point})::float8`,
      })
      .from(alerts)
      .where(
        and(
          inArray(alerts.status, ['OPEN', 'PENDING', 'ACKNOWLEDGED']),
          sql`${alerts.geom} is not null`,
          sql`ST_DWithin(${alerts.geom}, ${point}, ${radiusM})`,
        ),
      )
      .orderBy(sql`ST_Distance(${alerts.geom}, ${point}) ASC`);
    return rows;
  },

  async appendLocationLog(
    input: Omit<NewTouristLocationLog, 'id' | 'timestamp' | 'geom'>,
  ): Promise<void> {
    await db.insert(touristLocationLogs).values({
      ...input,
      geom: sql`ST_GeogFromText(${wkt(input.latitude, input.longitude)})` as unknown as string,
    });
  },
};
