-- Which status may follow which in the instance's workflow: a guided path, reopening included.
-- Must match DEFAULT_TRANSITIONS in packages/core/src/issues/default-fields.ts (checked by tests).

INSERT INTO "workflow_transitions" ("id", "workflow_id", "from_status_id", "to_status_id") VALUES
  -- New → To do, In progress, Resolved
  ('01a162b9-6774-7bf8-94e3-01971393af31', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-76c3-99ef-142009179f39', '01a16286-f097-7230-ae0a-2665141a1c79'),
  ('01a162b9-6774-7f51-80fc-08577a26042d', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-76c3-99ef-142009179f39', '01a16286-f097-797e-8ffe-9d08ab570fed'),
  ('01a162b9-6774-779e-af72-dfed260a5c10', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-76c3-99ef-142009179f39', '01a16286-f097-7d2f-8165-6070ac26c187'),
  -- To do → In progress, Resolved
  ('01a162b9-6774-7e26-bf50-c71fdffb408f', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7230-ae0a-2665141a1c79', '01a16286-f097-797e-8ffe-9d08ab570fed'),
  ('01a162b9-6775-729a-b3dc-817d5454dbaf', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7230-ae0a-2665141a1c79', '01a16286-f097-7d2f-8165-6070ac26c187'),
  -- In progress → To do, Waiting, Resolved
  ('01a162b9-6775-7391-afb8-1c8478f22b00', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-797e-8ffe-9d08ab570fed', '01a16286-f097-7230-ae0a-2665141a1c79'),
  ('01a162b9-6775-76c4-8640-0570292c975a', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-797e-8ffe-9d08ab570fed', '01a16286-f097-7910-adf1-e82c47706491'),
  ('01a162b9-6775-7bac-bcbb-d8fb7d96e477', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-797e-8ffe-9d08ab570fed', '01a16286-f097-7d2f-8165-6070ac26c187'),
  -- Waiting → In progress, Resolved
  ('01a162b9-6775-70ed-b915-e803652731fd', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7910-adf1-e82c47706491', '01a16286-f097-797e-8ffe-9d08ab570fed'),
  ('01a162b9-6775-762c-8300-2f750b78d197', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7910-adf1-e82c47706491', '01a16286-f097-7d2f-8165-6070ac26c187'),
  -- Resolved → To do: reopening
  ('01a162b9-6775-7459-9fab-ebafaa245a05', '01a16286-f096-7c5d-94b4-022c1ffb35a5', '01a16286-f097-7d2f-8165-6070ac26c187', '01a16286-f097-7230-ae0a-2665141a1c79');
