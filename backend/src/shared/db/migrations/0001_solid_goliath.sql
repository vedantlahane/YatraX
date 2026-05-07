CREATE TABLE "alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tourist_id" uuid NOT NULL,
	"alert_type" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"message" text,
	"media" text[],
	"latitude" double precision,
	"longitude" double precision,
	"geom" "geography(Geometry, 4326)",
	"pre_alert_triggered" boolean DEFAULT false NOT NULL,
	"escalation_level" integer DEFAULT 1 NOT NULL,
	"nearest_station_id" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"response_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
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
--> statement-breakpoint
CREATE TABLE "blockchain_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tourist_id" uuid NOT NULL,
	"data_hash" text NOT NULL,
	"transaction_id" text NOT NULL,
	"status" text DEFAULT 'SUCCESS_ISSUED_ON_TESTNET' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"geom" "geography(Geometry, 4326)" NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tourist_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'system' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"source_tab" text DEFAULT 'home' NOT NULL,
	"broadcast_target" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "police_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"department_code" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"geom" "geography(Geometry, 4326)" NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "risk_zones" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"shape_type" text NOT NULL,
	"center_lat" double precision,
	"center_lng" double precision,
	"radius_meters" integer,
	"polygon_coordinates" jsonb,
	"geom" "geography(Geometry, 4326)" NOT NULL,
	"risk_level" text DEFAULT 'MEDIUM' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"category" text,
	"source" text DEFAULT 'admin' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tourist_location_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tourist_id" uuid NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"geom" "geography(Geometry, 4326)" NOT NULL,
	"speed" double precision,
	"heading" double precision,
	"accuracy" double precision,
	"safety_score_at_time" integer DEFAULT 100 NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_advisories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'INFO' NOT NULL,
	"affected_area" text,
	"source" text DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tourists" ADD COLUMN "reset_token_hash" text;--> statement-breakpoint
ALTER TABLE "tourists" ADD COLUMN "reset_token_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tourist_id_tourists_id_fk" FOREIGN KEY ("tourist_id") REFERENCES "public"."tourists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_nearest_station_id_police_departments_id_fk" FOREIGN KEY ("nearest_station_id") REFERENCES "public"."police_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_police_departments_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."police_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blockchain_logs" ADD CONSTRAINT "blockchain_logs_tourist_id_tourists_id_fk" FOREIGN KEY ("tourist_id") REFERENCES "public"."tourists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tourist_id_tourists_id_fk" FOREIGN KEY ("tourist_id") REFERENCES "public"."tourists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tourist_location_logs" ADD CONSTRAINT "tourist_location_logs_tourist_id_tourists_id_fk" FOREIGN KEY ("tourist_id") REFERENCES "public"."tourists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_advisories" ADD CONSTRAINT "travel_advisories_created_by_police_departments_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."police_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_geom_idx" ON "alerts" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_tourist_status_idx" ON "alerts" USING btree ("tourist_id","status");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actor");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_ts_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "blockchain_tourist_idx" ON "blockchain_logs" USING btree ("tourist_id");--> statement-breakpoint
CREATE INDEX "blockchain_hash_idx" ON "blockchain_logs" USING btree ("data_hash");--> statement-breakpoint
CREATE INDEX "hospitals_geom_idx" ON "hospitals" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "hospitals_active_idx" ON "hospitals" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "hospitals_type_idx" ON "hospitals" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notif_tourist_read_idx" ON "notifications" USING btree ("tourist_id","read");--> statement-breakpoint
CREATE INDEX "notif_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "police_geom_idx" ON "police_departments" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "police_active_idx" ON "police_departments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "risk_zones_geom_idx" ON "risk_zones" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "risk_zones_active_idx" ON "risk_zones" USING btree ("active");--> statement-breakpoint
CREATE INDEX "loc_log_tourist_ts_idx" ON "tourist_location_logs" USING btree ("tourist_id","timestamp");--> statement-breakpoint
CREATE INDEX "loc_log_geom_idx" ON "tourist_location_logs" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "advisory_active_idx" ON "travel_advisories" USING btree ("active");--> statement-breakpoint
CREATE INDEX "advisory_severity_idx" ON "travel_advisories" USING btree ("severity");