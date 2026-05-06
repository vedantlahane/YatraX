import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { policeDepartments, type PoliceDepartment } from '../../shared/db/schema.js';

export const policeRepo = {
  async findNearestActive(
    lat: number,
    lng: number,
    maxMeters = 100_000,
  ): Promise<(PoliceDepartment & { distanceMeters: number }) | undefined> {
    const point = sql`ST_GeogFromText(${`SRID=4326;POINT(${lng} ${lat})`})`;
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
