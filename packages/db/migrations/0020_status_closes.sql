-- A status says whether it closes issues; it replaces its category (copied next, dropped after).
ALTER TABLE "statuses" ADD COLUMN "closes" boolean DEFAULT false NOT NULL;