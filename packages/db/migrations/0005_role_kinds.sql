ALTER TABLE "roles" ADD COLUMN "audience" text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "grants_all" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "color" text DEFAULT 'gray' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_unique" ON "roles" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "roles_single_grants_all" ON "roles" USING btree ("grants_all") WHERE "roles"."grants_all";--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_audience_check" CHECK ("roles"."audience" in ('internal', 'client'));--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_color_check" CHECK ("roles"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan'));--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_grants_all_internal" CHECK (not "roles"."grants_all" or "roles"."audience" = 'internal');