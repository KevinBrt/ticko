-- A workflow lets issues move along its transitions (defined), or from any status to any other (free).
ALTER TABLE "workflows" ADD COLUMN "mode" text DEFAULT 'defined' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_mode_check" CHECK ("workflows"."mode" in ('defined', 'free'));