import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { hospitals, type Hospital, type NewHospital } from '../../shared/db/schema.js';

const wkt = (lat: number, lng: number): string => `SRID=4326;POINT(${lng} ${lat})`;

export const hospitalRepo = {
  async findById(id: number): Promise<Hospital | undefined> {
    const [row] = await db.select().from(hospitals).where(eq(hospitals.id, id)).limit(1);
    return row;
  },

  async listAll(opts: {
    page: number;
    limit: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<{ items: Hospital[]; total: number }> {
    const offset = (opts.page - 1) * opts.limit;
    const searchWhere = opts.search
      ? or(
          ilike(hospitals.name, `%${opts.search}%`),
          ilike(hospitals.city, `%${opts.search}%`),
          ilike(hospitals.district, `%${opts.search}%`),
          ilike(hospitals.state, `%${opts.search}%`),
        )
      : undefined;

    const where = opts.activeOnly
      ? searchWhere
        ? and(eq(hospitals.isActive, true), searchWhere)
        : eq(hospitals.isActive, true)
      : searchWhere;

    const [items, totalRow] = await Promise.all([
      db
        .select()
        .from(hospitals)
        .where(where)
        .orderBy(desc(hospitals.createdAt))
        .limit(opts.limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hospitals)
        .where(where),
    ]);

    return { items, total: totalRow[0]?.count ?? 0 };
  },

  async create(input: Omit<NewHospital, 'id' | 'createdAt' | 'updatedAt' | 'geom'>): Promise<Hospital> {
    const values: Record<string, unknown> = {
      ...input,
      geom: sql`ST_GeogFromText(${wkt(input.latitude, input.longitude)})`,
    };
    const [row] = await db.insert(hospitals).values(values as NewHospital).returning();
    if (!row) throw new Error('Insert failed');
    return row;
  },

  async update(id: number, patch: Partial<NewHospital>): Promise<Hospital | undefined> {
    const payload: Record<string, unknown> = { ...patch, updatedAt: new Date() };
    if (patch.latitude != null && patch.longitude != null) {
      payload.geom = sql`ST_GeogFromText(${wkt(patch.latitude, patch.longitude)})`;
    }
    const [row] = await db.update(hospitals).set(payload).where(eq(hospitals.id, id)).returning();
    return row;
  },

  async remove(id: number): Promise<boolean> {
    const [row] = await db.delete(hospitals).where(eq(hospitals.id, id)).returning({ id: hospitals.id });
    return !!row;
  },

  async findNearestActive(lat: number, lng: number, maxMeters = 100_000): Promise<(Hospital & { distanceMeters: number }) | undefined> {
    const point = sql`ST_GeogFromText(${wkt(lat, lng)})`;
    const [row] = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        latitude: hospitals.latitude,
        longitude: hospitals.longitude,
        geom: hospitals.geom,
        contact: hospitals.contact,
        type: hospitals.type,
        tier: hospitals.tier,
        emergency: hospitals.emergency,
        city: hospitals.city,
        district: hospitals.district,
        state: hospitals.state,
        specialties: hospitals.specialties,
        bedCapacity: hospitals.bedCapacity,
        availableBeds: hospitals.availableBeds,
        operatingHours: hospitals.operatingHours,
        ambulanceAvailable: hospitals.ambulanceAvailable,
        isActive: hospitals.isActive,
        createdAt: hospitals.createdAt,
        updatedAt: hospitals.updatedAt,
        distanceMeters: sql<number>`ST_Distance(${hospitals.geom}, ${point})::float8`,
      })
      .from(hospitals)
      .where(
        and(
          eq(hospitals.isActive, true),
          sql`ST_DWithin(${hospitals.geom}, ${point}, ${maxMeters})`,
        ),
      )
      .orderBy(sql`ST_Distance(${hospitals.geom}, ${point}) ASC`)
      .limit(1);

    return row;
  },

  async listNearby(lat: number, lng: number, radiusKm: number): Promise<Array<Hospital & { distanceMeters: number }>> {
    const point = sql`ST_GeogFromText(${wkt(lat, lng)})`;
    const radiusMeters = radiusKm * 1000;
    const rows = await db
      .select({
        id: hospitals.id,
        name: hospitals.name,
        latitude: hospitals.latitude,
        longitude: hospitals.longitude,
        geom: hospitals.geom,
        contact: hospitals.contact,
        type: hospitals.type,
        tier: hospitals.tier,
        emergency: hospitals.emergency,
        city: hospitals.city,
        district: hospitals.district,
        state: hospitals.state,
        specialties: hospitals.specialties,
        bedCapacity: hospitals.bedCapacity,
        availableBeds: hospitals.availableBeds,
        operatingHours: hospitals.operatingHours,
        ambulanceAvailable: hospitals.ambulanceAvailable,
        isActive: hospitals.isActive,
        createdAt: hospitals.createdAt,
        updatedAt: hospitals.updatedAt,
        distanceMeters: sql<number>`ST_Distance(${hospitals.geom}, ${point})::float8`,
      })
      .from(hospitals)
      .where(
        and(
          eq(hospitals.isActive, true),
          sql`ST_DWithin(${hospitals.geom}, ${point}, ${radiusMeters})`,
        ),
      )
      .orderBy(sql`ST_Distance(${hospitals.geom}, ${point}) ASC`);

    return rows;
  },
};
