CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"unique_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_type_not_blank" CHECK (btrim("jobs"."type") <> ''),
	CONSTRAINT "jobs_status_check" CHECK ("jobs"."status" in ('pending', 'failed')),
	CONSTRAINT "jobs_attempts_check" CHECK ("jobs"."attempts" >= 0),
	CONSTRAINT "jobs_max_attempts_check" CHECK ("jobs"."max_attempts" >= 1)
);
--> statement-breakpoint
CREATE INDEX "jobs_pending_run_at_idx" ON "jobs" USING btree ("run_at") WHERE "jobs"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_pending_unique_key" ON "jobs" USING btree ("unique_key") WHERE "jobs"."status" = 'pending';