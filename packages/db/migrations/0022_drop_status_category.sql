-- A status's category is gone: whether it closes issues (copied by 0021) is all that remains.
ALTER TABLE "statuses" DROP CONSTRAINT "statuses_category_check";--> statement-breakpoint
ALTER TABLE "statuses" DROP COLUMN "category";