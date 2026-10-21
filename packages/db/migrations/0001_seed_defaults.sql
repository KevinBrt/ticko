-- Default roles and instance settings of a fresh instance.
-- Must match DEFAULT_ROLES in packages/core/src/permissions/default-roles.ts (checked by tests).
-- The first-run wizard rewrites the role names in the administrator's language.
INSERT INTO "roles" ("id", "name", "scope", "permissions") VALUES
  ('01a1569b-9800-7e64-8269-eb18fddc30ee', 'Administrator', 'instance', ARRAY['instance.settings.manage', 'instance.users.manage', 'instance.roles.manage', 'project.create']),
  ('01a1569b-9801-747e-91c9-d058653f2a8e', 'Team', 'instance', ARRAY['project.create']),
  ('01a1569b-9802-7f0a-b82f-656d1e2109c6', 'Requester', 'instance', ARRAY[]::text[]),
  ('01a1569b-9803-7856-9230-b7dbbd83f7d9', 'Administrator', 'project', ARRAY['project.settings.manage', 'project.members.manage', 'issue.read', 'issue.read.own', 'issue.create', 'issue.update', 'issue.assign', 'issue.delete', 'comment.create', 'comment.moderate']),
  ('01a1569b-9804-7f71-aa2b-43cdaa231795', 'Team', 'project', ARRAY['issue.read', 'issue.read.own', 'issue.create', 'issue.update', 'issue.assign', 'comment.create']),
  ('01a1569b-9805-7b83-b2a9-d516e9cec915', 'Requester', 'project', ARRAY['issue.read.own', 'issue.create', 'comment.create']);
--> statement-breakpoint
INSERT INTO "instance_settings" ("id", "name") VALUES (1, 'Toppo');
