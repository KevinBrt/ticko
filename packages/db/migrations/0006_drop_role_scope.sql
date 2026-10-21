ALTER TABLE "roles" DROP CONSTRAINT "roles_scope_check";--> statement-breakpoint
DROP INDEX "roles_scope_name_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "scope";