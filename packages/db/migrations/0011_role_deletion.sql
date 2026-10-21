ALTER TABLE "invitations" DROP CONSTRAINT "invitations_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_instance_role_id_roles_id_fk";
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "instance_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_instance_role_id_roles_id_fk" FOREIGN KEY ("instance_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_unless_accepted" CHECK ("invitations"."role_id" is not null or "invitations"."accepted_at" is not null);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_unless_deleted" CHECK ("users"."instance_role_id" is not null or "users"."deleted_at" is not null);