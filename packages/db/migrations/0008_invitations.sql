CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_email_lowercase" CHECK ("invitations"."email" = lower("invitations"."email")),
	CONSTRAINT "invitations_expire_after_creation" CHECK ("invitations"."expires_at" > "invitations"."created_at")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_unique" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_email_unique" ON "invitations" USING btree ("email") WHERE "invitations"."accepted_at" is null;--> statement-breakpoint
CREATE INDEX "invitations_role_id_idx" ON "invitations" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "invitations_invited_by_id_idx" ON "invitations" USING btree ("invited_by_id");