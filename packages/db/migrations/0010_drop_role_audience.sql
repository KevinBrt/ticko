ALTER TABLE "roles" DROP CONSTRAINT "roles_audience_check";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_grants_all_internal";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "audience";