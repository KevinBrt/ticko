CREATE TABLE "workflow_transitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"from_status_id" uuid NOT NULL,
	"to_status_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_transitions_unique" UNIQUE("workflow_id","from_status_id","to_status_id"),
	CONSTRAINT "workflow_transitions_not_to_itself" CHECK ("workflow_transitions"."from_status_id" <> "workflow_transitions"."to_status_id")
);
--> statement-breakpoint
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_from_fk" FOREIGN KEY ("workflow_id","from_status_id") REFERENCES "public"."workflow_statuses"("workflow_id","status_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_to_fk" FOREIGN KEY ("workflow_id","to_status_id") REFERENCES "public"."workflow_statuses"("workflow_id","status_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_transitions_to_idx" ON "workflow_transitions" USING btree ("workflow_id","to_status_id");