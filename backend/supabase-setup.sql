-- ============================================================
-- YatraX — Full Schema Setup
-- Run this in Supabase SQL Editor (yatrax project)
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Step 1: Enable PostGIS (required for geography columns)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Drizzle migrations table (tracks which migrations have run)
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- ============================================================
-- TABLES
-- ============================================================

-- tourists
CREATE TABLE IF NOT EXISTS "tourists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "passport_number" text NOT NULL,
  "password_hash" text NOT NULL,
  "reset_token_hash" text,
  "reset_token_expires" timestamp with time zone,
  "date_of_birth" text,
  "address" text,
  "gender" text,
  "nationality" text,
  "blood_type" text,
  "allergies" text[],
  "medical_conditions" text[],
  "emergency_contact" jsonb,
  "id_hash" text,
  "id_expiry" timestamp with time zone,
  "current_lat" double precision,
  "current_lng" double precision,
  "speed" double precision,
  "heading" double precision,
  "location_accuracy" double precision,
  "last_seen" timestamp with time zone,
  "safety_score" integer DEFAULT 100 NOT NULL,
  "last_score_update" timestamp with time zone,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tourists_email_unique" UNIQUE("email"),
  CONSTRAINT "tourists_idHash_unique" UNIQUE("id_hash")
);
CREATE INDEX IF NOT EXISTS "tourists_email_idx" ON "tourists" USING btree ("email");
CREATE INDEX IF NOT EXISTS "tourists_id_hash_idx" ON "tourists" USING btree ("id_hash");

-- police_departments
CREATE TABLE IF NOT EXISTS "police_departments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "department_code" text NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "geom" geography(Geometry, 4326) NOT NULL,
  "city" text NOT NULL,
  "district" text NOT NULL,
  "state" text NOT NULL,
  "contact_number" text NOT NULL,
  "station_type" text DEFAULT 'station' NOT NULL,
  "jurisdiction_radius_km" integer DEFAULT 10 NOT NULL,
  "officer_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "police_departments_email_unique" UNIQUE("email"),
  CONSTRAINT "police_departments_departmentCode_unique" UNIQUE("department_code")
);
CREATE INDEX IF NOT EXISTS "police_geom_idx" ON "police_departments" USING gist ("geom");
CREATE INDEX IF NOT EXISTS "police_active_idx" ON "police_departments" USING btree ("is_active");

-- risk_zones
CREATE TABLE IF NOT EXISTS "risk_zones" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "shape_type" text NOT NULL,
  "center_lat" double precision,
  "center_lng" double precision,
  "radius_meters" integer,
  "polygon_coordinates" jsonb,
  "geom" geography(Geometry, 4326) NOT NULL,
  "risk_level" text DEFAULT 'MEDIUM' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "category" text,
  "source" text DEFAULT 'admin' NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "risk_zones_geom_idx" ON "risk_zones" USING gist ("geom");
CREATE INDEX IF NOT EXISTS "risk_zones_active_idx" ON "risk_zones" USING btree ("active");

-- hospitals
CREATE TABLE IF NOT EXISTS "hospitals" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "geom" geography(Geometry, 4326) NOT NULL,
  "contact" text NOT NULL,
  "type" text DEFAULT 'hospital' NOT NULL,
  "tier" text,
  "emergency" boolean DEFAULT false NOT NULL,
  "city" text NOT NULL,
  "district" text NOT NULL,
  "state" text NOT NULL,
  "specialties" text[],
  "bed_capacity" integer DEFAULT 0 NOT NULL,
  "available_beds" integer DEFAULT 0 NOT NULL,
  "operating_hours" jsonb,
  "ambulance_available" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "hospitals_geom_idx" ON "hospitals" USING gist ("geom");
CREATE INDEX IF NOT EXISTS "hospitals_active_idx" ON "hospitals" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "hospitals_type_idx" ON "hospitals" USING btree ("type");

-- alerts
CREATE TABLE IF NOT EXISTS "alerts" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "tourist_id" uuid NOT NULL REFERENCES "tourists"("id") ON DELETE cascade,
  "alert_type" text NOT NULL,
  "priority" text DEFAULT 'MEDIUM' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "message" text,
  "media" text[],
  "latitude" double precision,
  "longitude" double precision,
  "geom" geography(Geometry, 4326),
  "pre_alert_triggered" boolean DEFAULT false NOT NULL,
  "escalation_level" integer DEFAULT 1 NOT NULL,
  "nearest_station_id" uuid REFERENCES "police_departments"("id") ON DELETE set null,
  "resolved_by" uuid REFERENCES "police_departments"("id") ON DELETE set null,
  "resolved_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "response_time_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "alerts_geom_idx" ON "alerts" USING gist ("geom");
CREATE INDEX IF NOT EXISTS "alerts_status_idx" ON "alerts" USING btree ("status");
CREATE INDEX IF NOT EXISTS "alerts_tourist_status_idx" ON "alerts" USING btree ("tourist_id", "status");
CREATE INDEX IF NOT EXISTS "alerts_created_idx" ON "alerts" USING btree ("created_at");

-- tourist_location_logs
CREATE TABLE IF NOT EXISTS "tourist_location_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "tourist_id" uuid NOT NULL REFERENCES "tourists"("id") ON DELETE cascade,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "geom" geography(Geometry, 4326) NOT NULL,
  "speed" double precision,
  "heading" double precision,
  "accuracy" double precision,
  "safety_score_at_time" integer DEFAULT 100 NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "loc_log_tourist_ts_idx" ON "tourist_location_logs" USING btree ("tourist_id", "timestamp");
CREATE INDEX IF NOT EXISTS "loc_log_geom_idx" ON "tourist_location_logs" USING gist ("geom");

-- notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "tourist_id" uuid NOT NULL REFERENCES "tourists"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text DEFAULT 'system' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "source_tab" text DEFAULT 'home' NOT NULL,
  "broadcast_target" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notif_tourist_read_idx" ON "notifications" USING btree ("tourist_id", "read");
CREATE INDEX IF NOT EXISTS "notif_created_idx" ON "notifications" USING btree ("created_at");

-- travel_advisories
CREATE TABLE IF NOT EXISTS "travel_advisories" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "severity" text DEFAULT 'INFO' NOT NULL,
  "affected_area" text,
  "source" text DEFAULT 'admin' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp with time zone,
  "created_by" uuid REFERENCES "police_departments"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "advisory_active_idx" ON "travel_advisories" USING btree ("active");
CREATE INDEX IF NOT EXISTS "advisory_severity_idx" ON "travel_advisories" USING btree ("severity");

-- audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "actor" text NOT NULL,
  "actor_type" text DEFAULT 'admin' NOT NULL,
  "action" text NOT NULL,
  "target_collection" text NOT NULL,
  "target_id" text NOT NULL,
  "changes" jsonb,
  "ip_address" text,
  "user_agent" text,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_logs" USING btree ("actor");
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_logs" USING btree ("action");
CREATE INDEX IF NOT EXISTS "audit_ts_idx" ON "audit_logs" USING btree ("timestamp");

-- blockchain_logs
CREATE TABLE IF NOT EXISTS "blockchain_logs" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "tourist_id" uuid NOT NULL REFERENCES "tourists"("id") ON DELETE cascade,
  "data_hash" text NOT NULL,
  "transaction_id" text NOT NULL,
  "status" text DEFAULT 'SUCCESS_ISSUED_ON_TESTNET' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "blockchain_tourist_idx" ON "blockchain_logs" USING btree ("tourist_id");
CREATE INDEX IF NOT EXISTS "blockchain_hash_idx" ON "blockchain_logs" USING btree ("data_hash");

-- ============================================================
-- Mark migrations as applied so drizzle-kit doesn't re-run them
-- ============================================================
INSERT INTO "__drizzle_migrations" (hash, created_at)
VALUES
  ('0000_overconfident_proteus', extract(epoch from now())::bigint * 1000),
  ('0001_solid_goliath', extract(epoch from now())::bigint * 1000)
ON CONFLICT DO NOTHING;

-- Done ✅
SELECT 'YatraX schema created successfully' AS result;
