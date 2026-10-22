ALTER TABLE "issue_categories" DROP CONSTRAINT "issue_categories_color_check";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_color_check";--> statement-breakpoint
ALTER TABLE "statuses" DROP CONSTRAINT "statuses_color_check";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color" text DEFAULT 'gray' NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_categories" ADD CONSTRAINT "issue_categories_color_check" CHECK ("issue_categories"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_color_check" CHECK ("projects"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink'));--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_color_check" CHECK ("roles"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink'));--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_color_check" CHECK ("statuses"."color" in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink'));