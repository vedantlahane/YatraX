CREATE TABLE "tourists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"passport_number" text NOT NULL,
	"password_hash" text NOT NULL,
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
--> statement-breakpoint
CREATE INDEX "tourists_email_idx" ON "tourists" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tourists_id_hash_idx" ON "tourists" USING btree ("id_hash");