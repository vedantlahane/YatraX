import { and, desc, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { riskZones, type RiskZone, type NewRiskZone } from '../../shared/db/schema.js';
import type { CreateRiskZoneInput, UpdateRiskZoneInput, NearbyQuery } from './risk-zone.schema.js';

function pointWkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

function polygonWkt(coords: number[][]): string {
  const ring = coords.map(([lat, lng]) => `${lng} ${lat}`);
  if (ring[0] !== ring[ring.length - 1]) ring.push(ring[0]!);
  return `SRID=4326;POLYGON((${ring.join(',')}))`;
}

function geomFromInput(input: Pick<CreateRiskZoneInput, 'shapeType'> & Partial<CreateRiskZoneInput>) {
  if (input.shapeType === 'circle') {
    return sql`ST_GeogFromText(${pointWkt(input.centerLat!, input.centerLng!)})`;
  }
  return sql`ST_GeogFromText(${polygonWkt(input.polygonCoordinates!)})`;
}

export const riskZoneRepo = {
  async create(input: CreateRiskZoneInput): Promise<RiskZone> {
    const values = {
      name: input.name,
      description: input.description ?? null,
      shapeType: input.shapeType,
      centerLat: input.shapeType === 'circle' ? input.centerLat : null,
      centerLng: input.shapeType === 'circle' ? input.centerLng : null,
      radiusMeters: input.shapeType === 'circle' ? input.radiusMeters : null,
      polygonCoordinates: input.shapeType === 'polygon' ? input.polygonCoordinates : null,
      geom: geomFromInput(input) as unknown as string,
      riskLevel: input.riskLevel,
      active: input.active,
      category: input.category ?? null,
      source: input.source,
      expiresAt: input.expiresAt ?? null,
    } satisfies NewRiskZone;

    const [row] = await db.insert(riskZones).values(values).returning();
    if (!row) throw new Error('Insert failed');
    return row;
  },

  async findById(id: number): Promise<RiskZone | undefined> {
    const [row] = await db.select().from(riskZones).where(eq(riskZones.id, id)).limit(1);
    return row;
  },

  async listAll(): Promise<RiskZone[]> {
    return db.select().from(riskZones).orderBy(desc(riskZones.createdAt));
  },

  async listActive(): Promise<RiskZone[]> {
    return db
      .select()
      .from(riskZones)
      .where(eq(riskZones.active, true))
      .orderBy(desc(riskZones.createdAt));
  },

  async update(id: number, patch: UpdateRiskZoneInput): Promise<RiskZone | undefined> {
    const reshape =
      patch.shapeType !== undefined ||
      patch.centerLat !== undefined ||
      patch.centerLng !== undefined ||
      patch.radiusMeters !== undefined ||
      patch.polygonCoordinates !== undefined;

    const set: Record<string, unknown> = { updatedAt: new Date() };

    if (patch.name !== undefined) set.name = patch.name;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.riskLevel !== undefined) set.riskLevel = patch.riskLevel;
    if (patch.active !== undefined) set.active = patch.active;
    if (patch.category !== undefined) set.category = patch.category;
    if (patch.source !== undefined) set.source = patch.source;
    if (patch.expiresAt !== undefined) set.expiresAt = patch.expiresAt;

    if (reshape) {
      const existing = await this.findById(id);
      if (!existing) return undefined;

      const shapeType = patch.shapeType ?? (existing.shapeType as 'circle' | 'polygon');

      if (shapeType === 'circle') {
        const centerLat = patch.centerLat ?? existing.centerLat;
        const centerLng = patch.centerLng ?? existing.centerLng;
        const radiusMeters = patch.radiusMeters ?? existing.radiusMeters;
        if (centerLat == null || centerLng == null || radiusMeters == null) {
          throw new Error('Circle zone requires centerLat, centerLng, radiusMeters');
        }
        set.shapeType = 'circle';
        set.centerLat = centerLat;
        set.centerLng = centerLng;
        set.radiusMeters = radiusMeters;
        set.polygonCoordinates = null;
        set.geom = sql`ST_GeogFromText(${pointWkt(centerLat, centerLng)})`;
      } else {
        const coords = patch.polygonCoordinates ?? existing.polygonCoordinates;
        if (!coords || coords.length < 3) {
          throw new Error('Polygon zone requires at least 3 coordinates');
        }
        set.shapeType = 'polygon';
        set.polygonCoordinates = coords;
        set.centerLat = null;
        set.centerLng = null;
        set.radiusMeters = null;
        set.geom = sql`ST_GeogFromText(${polygonWkt(coords)})`;
      }
    }

    const [row] = await db
      .update(riskZones)
      .set(set)
      .where(eq(riskZones.id, id))
      .returning();
    return row;
  },

  async remove(id: number): Promise<boolean> {
    const [row] = await db.delete(riskZones).where(eq(riskZones.id, id)).returning({ id: riskZones.id });
    return !!row;
  },

  async bulkSetActive(ids: number[], active: boolean): Promise<number> {
    const rows = await db
      .update(riskZones)
      .set({ active, updatedAt: new Date() })
      .where(inArray(riskZones.id, ids))
      .returning({ id: riskZones.id });
    return rows.length;
  },

  async nearby(query: NearbyQuery): Promise<Array<RiskZone & { distanceMeters: number }>> {
    const { lat, lng, radiusKm, riskLevel } = query;
    const radiusM = radiusKm * 1000;
    const point = sql`ST_GeogFromText(${pointWkt(lat, lng)})`;

    const conditions: Array<unknown> = [
      eq(riskZones.active, true),
      sql`ST_DWithin(${riskZones.geom}, ${point}, ${radiusM})`,
    ];
    if (riskLevel) conditions.push(eq(riskZones.riskLevel, riskLevel));

    const cols = getTableColumns(riskZones);

    const rows = await db
      .select({
        ...cols,
        distanceMeters: sql<number>`ST_Distance(${riskZones.geom}, ${point})::float8`,
      })
      .from(riskZones)
      .where(and(...(conditions as any)))
      .orderBy(sql`ST_Distance(${riskZones.geom}, ${point}) ASC`);

    return rows;
  },

  async stats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    expiringSoon: number;
  }> {
    const totals = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${riskZones.active} = true)::int`,
        inactive: sql<number>`count(*) filter (where ${riskZones.active} = false)::int`,
      })
      .from(riskZones);

    const sev = await db
      .select({ k: riskZones.riskLevel, c: sql<number>`count(*)::int` })
      .from(riskZones)
      .groupBy(riskZones.riskLevel);

    const cat = await db
      .select({ k: riskZones.category, c: sql<number>`count(*)::int` })
      .from(riskZones)
      .where(sql`${riskZones.category} is not null`)
      .groupBy(riskZones.category);

    const src = await db
      .select({ k: riskZones.source, c: sql<number>`count(*)::int` })
      .from(riskZones)
      .groupBy(riskZones.source);

    const [soon] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(riskZones)
      .where(
        sql`${riskZones.expiresAt} is not null
            and ${riskZones.expiresAt} > now()
            and ${riskZones.expiresAt} <= now() + interval '7 days'`,
      );

    const toRecord = (rows: Array<{ k: string | null; c: number }>) =>
      Object.fromEntries(rows.map((r) => [r.k ?? 'unknown', r.c]));

    return {
      total: totals[0]?.total ?? 0,
      active: totals[0]?.active ?? 0,
      inactive: totals[0]?.inactive ?? 0,
      bySeverity: toRecord(sev),
      byCategory: toRecord(cat),
      bySource: toRecord(src),
      expiringSoon: soon?.c ?? 0,
    };
  },

  async deactivateExpired(): Promise<number> {
    const rows = await db
      .update(riskZones)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(riskZones.active, true),
          sql`${riskZones.expiresAt} is not null and ${riskZones.expiresAt} <= now()`,
        ),
      )
      .returning({ id: riskZones.id });
    return rows.length;
  },
};
