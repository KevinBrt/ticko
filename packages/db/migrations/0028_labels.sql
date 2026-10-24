CREATE TABLE "issue_labels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_labels_unique" UNIQUE("issue_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labels_name_not_blank" CHECK (btrim("labels"."name") <> ''),
	CONSTRAINT "labels_name_length" CHECK (char_length("labels"."name") <= 40),
	CONSTRAINT "labels_color_check" CHECK ("labels"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink'))
);
--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_labels_label_id_idx" ON "issue_labels" USING btree ("label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_name_unique" ON "labels" USING btree (lower("name"));