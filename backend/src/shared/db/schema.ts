import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  bigserial,
  index,
} from 'drizzle-orm/pg-core';

// We'll add tables module-by-module. Start with tourists + sessions to prove the pipe.
export const tourists = pgTable(
  'tourists',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    phone: text().notNull(),
    passportNumber: text().notNull(),
    passwordHash: text().notNull(),

    dateOfBirth: text(),
    address: text(),
    gender: text(),
    nationality: text(),
    bloodType: text(),
    allergies: text().array(),
    medicalConditions: text().array(),
    emergencyContact: jsonb().$type<{ name?: string; phone?: string; relationship?: string }>(),

    idHash: text().unique(),
    idExpiry: timestamp({ withTimezone: true }),

    currentLat: doublePrecision(),
    currentLng: doublePrecision(),
    speed: doublePrecision(),
    heading: doublePrecision(),
    locationAccuracy: doublePrecision(),
    lastSeen: timestamp({ withTimezone: true }),

    safetyScore: integer().notNull().default(100),
    lastScoreUpdate: timestamp({ withTimezone: true }),

    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tourists_email_idx').on(t.email),
    index('tourists_id_hash_idx').on(t.idHash),
  ],
);

export type Tourist = typeof tourists.$inferSelect;
export type NewTourist = typeof tourists.$inferInsert;