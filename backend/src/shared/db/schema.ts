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
  customType,
} from 'drizzle-orm/pg-core';

// ─── PostGIS geography type ──────────────────────────────────────────────────
const geography = customType<{ data: string }>({
  dataType() {
    return 'geography(Geometry, 4326)';
  },
});

// ─── TOURISTS ────────────────────────────────────────────────────────────────
export const tourists = pgTable(
  'tourists',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    phone: text().notNull(),
    passportNumber: text().notNull(),
    passwordHash: text().notNull(),
    resetTokenHash: text(),
    resetTokenExpires: timestamp({ withTimezone: true }),

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

// ─── RISK ZONES ───────────────────────────────────────────────────────────────
export const riskZones = pgTable(
  'risk_zones',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    name: text().notNull(),
    description: text(),

    shapeType: text().notNull(),

    centerLat: doublePrecision(),
    centerLng: doublePrecision(),
    radiusMeters: integer(),

    polygonCoordinates: jsonb().$type<number[][]>(),

    geom: geography().notNull(),

    riskLevel: text().notNull().default('MEDIUM'),
    active: boolean().notNull().default(true),
    category: text(),
    source: text().notNull().default('admin'),
    expiresAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('risk_zones_geom_idx').using('gist', t.geom),
    index('risk_zones_active_idx').on(t.active),
  ],
);
export type RiskZone = typeof riskZones.$inferSelect;
export type NewRiskZone = typeof riskZones.$inferInsert;

// ─── POLICE DEPARTMENTS ───────────────────────────────────────────────────────
export const policeDepartments = pgTable(
  'police_departments',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    departmentCode: text().notNull().unique(),

    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    geom: geography().notNull(),

    city: text().notNull(),
    district: text().notNull(),
    state: text().notNull(),
    contactNumber: text().notNull(),

    stationType: text().notNull().default('station'),
    jurisdictionRadiusKm: integer().notNull().default(10),
    officerCount: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('police_geom_idx').using('gist', t.geom),
    index('police_active_idx').on(t.isActive),
  ],
);
export type PoliceDepartment = typeof policeDepartments.$inferSelect;
export type NewPoliceDepartment = typeof policeDepartments.$inferInsert;

// ─── HOSPITALS ────────────────────────────────────────────────────────────────
export const hospitals = pgTable(
  'hospitals',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    name: text().notNull(),

    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    geom: geography().notNull(),

    contact: text().notNull(),
    type: text().notNull().default('hospital'),
    tier: text(),
    emergency: boolean().notNull().default(false),

    city: text().notNull(),
    district: text().notNull(),
    state: text().notNull(),

    specialties: text().array(),
    bedCapacity: integer().notNull().default(0),
    availableBeds: integer().notNull().default(0),
    operatingHours: jsonb().$type<{ open?: string; close?: string; is24Hours?: boolean }>(),
    ambulanceAvailable: boolean().notNull().default(false),

    isActive: boolean().notNull().default(true),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('hospitals_geom_idx').using('gist', t.geom),
    index('hospitals_active_idx').on(t.isActive),
    index('hospitals_type_idx').on(t.type),
  ],
);
export type Hospital = typeof hospitals.$inferSelect;
export type NewHospital = typeof hospitals.$inferInsert;

// ─── ALERTS ───────────────────────────────────────────────────────────────────
export const alerts = pgTable(
  'alerts',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    touristId: uuid().notNull().references(() => tourists.id, { onDelete: 'cascade' }),

    alertType: text().notNull(),
    priority: text().notNull().default('MEDIUM'),
    status: text().notNull().default('OPEN'),

    message: text(),
    media: text().array(),

    latitude: doublePrecision(),
    longitude: doublePrecision(),
    geom: geography(),

    preAlertTriggered: boolean().notNull().default(false),
    escalationLevel: integer().notNull().default(1),

    nearestStationId: uuid().references(() => policeDepartments.id, { onDelete: 'set null' }),
    resolvedBy: uuid().references(() => policeDepartments.id, { onDelete: 'set null' }),
    resolvedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    responseTimeMs: integer(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('alerts_geom_idx').using('gist', t.geom),
    index('alerts_status_idx').on(t.status),
    index('alerts_tourist_status_idx').on(t.touristId, t.status),
    index('alerts_created_idx').on(t.createdAt),
  ],
);
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

// ─── TOURIST LOCATION LOGS ────────────────────────────────────────────────────
export const touristLocationLogs = pgTable(
  'tourist_location_logs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    touristId: uuid().notNull().references(() => tourists.id, { onDelete: 'cascade' }),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    geom: geography().notNull(),
    speed: doublePrecision(),
    heading: doublePrecision(),
    accuracy: doublePrecision(),
    safetyScoreAtTime: integer().notNull().default(100),
    timestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('loc_log_tourist_ts_idx').on(t.touristId, t.timestamp),
    index('loc_log_geom_idx').using('gist', t.geom),
  ],
);
export type TouristLocationLog = typeof touristLocationLogs.$inferSelect;
export type NewTouristLocationLog = typeof touristLocationLogs.$inferInsert;

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    touristId: uuid().notNull().references(() => tourists.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    message: text().notNull(),
    type: text().notNull().default('system'),       // 'system' | 'alert' | 'broadcast' | 'advisory'
    priority: text().notNull().default('normal'),   // 'low' | 'normal' | 'high' | 'urgent'
    read: boolean().notNull().default(false),
    sourceTab: text().notNull().default('home'),
    broadcastTarget: text(),                        // 'all' | 'tourist:<id>' | 'zone:<id>'
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notif_tourist_read_idx').on(t.touristId, t.read),
    index('notif_created_idx').on(t.createdAt),
  ],
);
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ─── TRAVEL ADVISORIES ───────────────────────────────────────────────────────
export const travelAdvisories = pgTable(
  'travel_advisories',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    title: text().notNull(),
    body: text().notNull(),
    severity: text().notNull().default('INFO'),     // 'INFO' | 'WARNING' | 'CRITICAL'
    affectedArea: text(),
    source: text().notNull().default('admin'),
    active: boolean().notNull().default(true),
    expiresAt: timestamp({ withTimezone: true }),
    createdBy: uuid().references(() => policeDepartments.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('advisory_active_idx').on(t.active),
    index('advisory_severity_idx').on(t.severity),
  ],
);
export type TravelAdvisory = typeof travelAdvisories.$inferSelect;
export type NewTravelAdvisory = typeof travelAdvisories.$inferInsert;

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    actor: text().notNull(),                        // UUID or 'system'
    actorType: text().notNull().default('admin'),   // 'admin' | 'system'
    action: text().notNull(),
    targetCollection: text().notNull(),
    targetId: text().notNull(),
    changes: jsonb().$type<Record<string, unknown>>(),
    ipAddress: text(),
    userAgent: text(),
    timestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_actor_idx').on(t.actor),
    index('audit_action_idx').on(t.action),
    index('audit_ts_idx').on(t.timestamp),
  ],
);
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ─── BLOCKCHAIN LOGS ──────────────────────────────────────────────────────────
export const blockchainLogs = pgTable(
  'blockchain_logs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    touristId: uuid().notNull().references(() => tourists.id, { onDelete: 'cascade' }),
    dataHash: text().notNull(),
    transactionId: text().notNull(),
    status: text().notNull().default('SUCCESS_ISSUED_ON_TESTNET'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('blockchain_tourist_idx').on(t.touristId),
    index('blockchain_hash_idx').on(t.dataHash),
  ],
);
export type BlockchainLog = typeof blockchainLogs.$inferSelect;
export type NewBlockchainLog = typeof blockchainLogs.$inferInsert;