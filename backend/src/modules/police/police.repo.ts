import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import {
  policeDepartments,
  type NewPoliceDepartment,
  type PoliceDepartment,
} from '../../shared/db/schema.js';

const wkt = (lat: number, lng: number): string => `SRID=4326;POINT(${lng} ${lat})`;

export const policeRepo = {
  async findById(id: string): Promise<PoliceDepartment | undefined> {
    const [row] = await db.select().from(policeDepartments).where(eq(policeDepartments.id, id)).limit(1);
    return row;
  },

  async findByEmail(email: string): Promise<PoliceDepartment | undefined> {
    const [row] = await db.select().from(policeDepartments).where(eq(policeDepartments.email, email)).limit(1);
    return row;
  },

  async listAll(search?: string): Promise<PoliceDepartment[]> {
    const where = search
      ? or(
          ilike(policeDepartments.name, `%${search}%`),
          ilike(policeDepartments.email, `%${search}%`),
          ilike(policeDepartments.departmentCode, `%${search}%`),
          ilike(policeDepartments.city, `%${search}%`),
          ilike(policeDepartments.district, `%${search}%`),
          ilike(policeDepartments.state, `%${search}%`),
        )
      : undefined;

    return db
      .select()
      .from(policeDepartments)
      .where(where)
      .orderBy(desc(policeDepartments.createdAt), asc(policeDepartments.name));
  },

  async create(input: Omit<NewPoliceDepartment, 'id' | 'createdAt' | 'updatedAt' | 'geom'>): Promise<PoliceDepartment> {
    const values: Record<string, unknown> = {
      ...input,
      geom: sql`ST_GeogFromText(${wkt(input.latitude, input.longitude)})`,
    };
    const [row] = await db.insert(policeDepartments).values(values as NewPoliceDepartment).returning();
    if (!row) throw new Error('Insert failed');
    return row;
  },

  async update(id: string, patch: Partial<NewPoliceDepartment>): Promise<PoliceDepartment | undefined> {
    const payload: Record<string, unknown> = { ...patch, updatedAt: new Date() };
    if (patch.latitude != null && patch.longitude != null) {
      payload.geom = sql`ST_GeogFromText(${wkt(patch.latitude, patch.longitude)})`;
    }
    const [row] = await db
      .update(policeDepartments)
      .set(payload)
      .where(eq(policeDepartments.id, id))
      .returning();
    return row;
  },

  async remove(id: string): Promise<boolean> {
    const [row] = await db.delete(policeDepartments).where(eq(policeDepartments.id, id)).returning({ id: policeDepartments.id });
    return !!row;
  },

  async findNearestActive(
    lat: number,
    lng: number,
    maxMeters = 100_000,
  ): Promise<(PoliceDepartment & { distanceMeters: number }) | undefined> {
    const point = sql`ST_GeogFromText(${wkt(lat, lng)})`;
    const [row] = await db
      .select({
        id: policeDepartments.id,
        name: policeDepartments.name,
        email: policeDepartments.email,
        passwordHash: policeDepartments.passwordHash,
        departmentCode: policeDepartments.departmentCode,
        latitude: policeDepartments.latitude,
        longitude: policeDepartments.longitude,
        geom: policeDepartments.geom,
        city: policeDepartments.city,
        district: policeDepartments.district,
        state: policeDepartments.state,
        contactNumber: policeDepartments.contactNumber,
        stationType: policeDepartments.stationType,
        jurisdictionRadiusKm: policeDepartments.jurisdictionRadiusKm,
        officerCount: policeDepartments.officerCount,
        isActive: policeDepartments.isActive,
        createdAt: policeDepartments.createdAt,
        updatedAt: policeDepartments.updatedAt,
        distanceMeters: sql<number>`ST_Distance(${policeDepartments.geom}, ${point})::float8`,
      })
      .from(policeDepartments)
      .where(
        and(
          eq(policeDepartments.isActive, true),
          sql`ST_DWithin(${policeDepartments.geom}, ${point}, ${maxMeters})`,
        ),
      )
      .orderBy(sql`ST_Distance(${policeDepartments.geom}, ${point}) ASC`)
      .limit(1);
    return row;
  },
};
