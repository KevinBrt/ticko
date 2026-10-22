CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_id" uuid,
	"actor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"invitation_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"position" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_categories_name_not_blank" CHECK (btrim("issue_categories"."name") <> ''),
	CONSTRAINT "issue_categories_color_check" CHECK ("issue_categories"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan')),
	CONSTRAINT "issue_categories_position_check" CHECK ("issue_categories"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status_id" uuid NOT NULL,
	"priority_id" uuid NOT NULL,
	"assignee_id" uuid,
	"reporter_id" uuid NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issues_project_number_unique" UNIQUE("project_id","number"),
	CONSTRAINT "issues_number_positive" CHECK ("issues"."number" >= 1),
	CONSTRAINT "issues_title_not_blank" CHECK (btrim("issues"."title") <> ''),
	CONSTRAINT "issues_title_length" CHECK (char_length("issues"."title") <= 200),
	CONSTRAINT "issues_description_length" CHECK (char_length("issues"."description") <= 50000)
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "priorities_level_check" CHECK ("priorities"."level" between 1 and 4),
	CONSTRAINT "priorities_name_not_blank" CHECK (btrim("priorities"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"archived_at" timestamp with time zone,
	"next_issue_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_key_format" CHECK ("projects"."key" ~ '^[A-Z][A-Z0-9]{1,9}$'),
	CONSTRAINT "projects_name_not_blank" CHECK (btrim("projects"."name") <> ''),
	CONSTRAINT "projects_next_issue_number_positive" CHECK ("projects"."next_issue_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statuses_name_not_blank" CHECK (btrim("statuses"."name") <> ''),
	CONSTRAINT "statuses_category_check" CHECK ("statuses"."category" in ('todo', 'in_progress', 'done')),
	CONSTRAINT "statuses_color_check" CHECK ("statuses"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan'))
);
--> statement-breakpoint
CREATE TABLE "workflow_statuses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"is_initial" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_statuses_workflow_status_unique" UNIQUE("workflow_id","status_id"),
	CONSTRAINT "workflow_statuses_position_check" CHECK ("workflow_statuses"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_project_unique" UNIQUE NULLS NOT DISTINCT("project_id")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "all_projects" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "all_projects" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_projects" ADD CONSTRAINT "invitation_projects_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_projects" ADD CONSTRAINT "invitation_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_category_id_issue_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."issue_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_issue_id_created_at_idx" ON "activities" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "activities_project_id_idx" ON "activities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activities_actor_id_idx" ON "activities" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_projects_invitation_project_unique" ON "invitation_projects" USING btree ("invitation_id","project_id");--> statement-breakpoint
CREATE INDEX "invitation_projects_project_id_idx" ON "invitation_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_categories_name_unique" ON "issue_categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "issue_categories_single_default" ON "issue_categories" USING btree ("is_default") WHERE "issue_categories"."is_default";--> statement-breakpoint
CREATE INDEX "issues_category_id_idx" ON "issues" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "issues_status_id_idx" ON "issues" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "issues_priority_id_idx" ON "issues" USING btree ("priority_id");--> statement-breakpoint
CREATE INDEX "issues_assignee_id_idx" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issues_reporter_id_idx" ON "issues" USING btree ("reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "priorities_level_unique" ON "priorities" USING btree ("level");--> statement-breakpoint
CREATE UNIQUE INDEX "priorities_single_default" ON "priorities" USING btree ("is_default") WHERE "priorities"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_unique" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_role_id_idx" ON "project_members" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_key_unique" ON "projects" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "statuses_name_unique" ON "statuses" USING btree (coalesce("project_id", '00000000-0000-0000-0000-000000000000'::uuid),lower("name"));--> statement-breakpoint
CREATE INDEX "statuses_project_id_idx" ON "statuses" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_statuses_single_initial" ON "workflow_statuses" USING btree ("workflow_id") WHERE "workflow_statuses"."is_initial";--> statement-breakpoint
CREATE INDEX "workflow_statuses_status_id_idx" ON "workflow_statuses" USING btree ("status_id");