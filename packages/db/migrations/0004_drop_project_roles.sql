-- Roles are no longer split between instance and project level: one list serves both, and a
-- project may give a member another role from it. Project-level roles go away; nothing refers to
-- them yet (there are no project members), and a reference would make this migration fail.
DELETE FROM "roles" WHERE "scope" = 'project';
