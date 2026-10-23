ALTER TABLE "comments" ADD CONSTRAINT "comments_id_issue_unique" UNIQUE("id","issue_id");--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"comment_id" uuid,
	"uploader_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "attachments_file_name_not_blank" CHECK (btrim("attachments"."file_name") <> ''),
	CONSTRAINT "attachments_file_name_length" CHECK (char_length("attachments"."file_name") <= 255),
	CONSTRAINT "attachments_media_type_check" CHECK ("attachments"."media_type" in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation')),
	CONSTRAINT "attachments_size_check" CHECK ("attachments"."size" between 1 and 1073741824),
	CONSTRAINT "attachments_storage_key_check" CHECK ("attachments"."storage_key" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_comment_fk" FOREIGN KEY ("comment_id","issue_id") REFERENCES "public"."comments"("id","issue_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_issue_id_created_at_idx" ON "attachments" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "attachments_comment_id_created_at_idx" ON "attachments" USING btree ("comment_id","created_at") WHERE "attachments"."comment_id" is not null;--> statement-breakpoint
CREATE INDEX "attachments_uploader_id_idx" ON "attachments" USING btree ("uploader_id");
