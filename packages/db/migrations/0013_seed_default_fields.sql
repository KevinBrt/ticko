-- What a fresh instance starts with: the workflow, the priorities and the categories.
-- Must match packages/core/src/issues/default-fields.ts (checked by tests).
-- Names are in English; the first-run wizard renames them in the administrator's language.

INSERT INTO "workflows" ("id", "project_id") VALUES ('01a16286-f096-7c5d-94b4-022c1ffb35a5', NULL);
--> statement-breakpoint
INSERT INTO "statuses" ("id", "name", "category", "color") VALUES
  ('01a16286-f097-76c3-99ef-142009179f39', 'New', 'todo', 'cyan'),
  ('01a16286-f097-7230-ae0a-2665141a1c79', 'To do', 'todo', 'blue'),
  ('01a16286-f097-797e-8ffe-9d08ab570fed', 'In progress', 'in_progress', 'violet'),
  ('01a16286-f097-7910-adf1-e82c47706491', 'Waiting', 'in_progress', 'amber'),
  ('01a16286-f097-7d2f-8165-6070ac26c187', 'Resolved', 'done', 'green');
--> statement-breakpoint
INSERT INTO "workflow_statuses" ("id", "workflow_id", "status_id", "position", "is_initial") VALUES
  ('01a16286-f097-728e-8429-a636fe6a8ba0', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-76c3-99ef-142009179f39', 0, true),
  ('01a16286-f097-7b84-b497-9e484c1b6b09', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7230-ae0a-2665141a1c79', 1, false),
  ('01a16286-f097-7ce6-80c3-8b1f10af70f4', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-797e-8ffe-9d08ab570fed', 2, false),
  ('01a16286-f097-76fd-a12f-c4e528008154', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7910-adf1-e82c47706491', 3, false),
  ('01a16286-f097-7896-93d3-94335035dec0', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7d2f-8165-6070ac26c187', 4, false);
--> statement-breakpoint
INSERT INTO "priorities" ("id", "level", "name", "is_default") VALUES
  ('01a16286-f097-7420-b8b5-53e31ece4809', 1, 'Low', false),
  ('01a16286-f097-741e-8499-8d3adbd5c2d6', 2, 'Normal', true),
  ('01a16286-f097-7031-b0a5-653999e6a1e3', 3, 'High', false),
  ('01a16286-f098-702e-b31c-00b4639a6236', 4, 'Urgent', false);
--> statement-breakpoint
INSERT INTO "issue_categories" ("id", "name", "color", "position", "is_default") VALUES
  ('01a16286-f098-7e89-95b4-e2b2aa971d11', 'Bug', 'gray', 0, false),
  ('01a16286-f098-7eba-93de-76873ba83fec', 'Request', 'gray', 1, true),
  ('01a16286-f098-7082-a99d-9636cf947dea', 'Question', 'gray', 2, false);
