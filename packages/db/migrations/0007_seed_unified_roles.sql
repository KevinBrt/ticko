-- The default roles, now serving both the instance and projects.
-- Must match DEFAULT_ROLES in packages/core/src/permissions/default-roles.ts (checked by tests).
-- Names are left as they are: the first-run wizard may already have written them in French.

-- Administrator: the system role, which grants every permission whatever it stores.
UPDATE "roles" SET "grants_all" = true, "audience" = 'internal', "color" = 'blue', "permissions" = ARRAY[]::text[]
WHERE "id" = '01a1569b-9800-7e64-8269-eb18fddc30ee';
--> statement-breakpoint
UPDATE "roles" SET "audience" = 'internal', "color" = 'green', "permissions" = ARRAY['issue.read', 'issue.read.own', 'issue.create', 'issue.update', 'issue.assign', 'comment.create', 'project.create']
WHERE "id" = '01a1569b-9801-747e-91c9-d058653f2a8e';
--> statement-breakpoint
UPDATE "roles" SET "audience" = 'client', "color" = 'gray', "permissions" = ARRAY['issue.read.own', 'issue.create', 'comment.create']
WHERE "id" = '01a1569b-9802-7f0a-b82f-656d1e2109c6';
