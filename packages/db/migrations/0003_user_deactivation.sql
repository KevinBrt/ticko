ALTER TABLE "users" ALTER COLUMN "instance_role_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;