-- Projects are set up by administrators: the Team role no longer creates them by default.
-- Any role can still be given the permission in the roles matrix.
-- Must match DEFAULT_ROLES in packages/core/src/permissions/default-roles.ts (checked by tests).

UPDATE "roles"
SET "permissions" = array_remove("permissions", 'project.create'), "updated_at" = now()
WHERE "id" = '01a1569b-9801-747e-91c9-d058653f2a8e';
