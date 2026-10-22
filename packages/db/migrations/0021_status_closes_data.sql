-- A status closes issues when its category was "done": Resolved by default, and any other
-- status an administrator put there. Must match DEFAULT_STATUSES in
-- packages/core/src/issues/default-fields.ts (checked by tests).

UPDATE "statuses" SET "closes" = ("category" = 'done');
