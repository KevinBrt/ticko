import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from '../uuid.ts';

export const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/**
 * `created_at` and `updated_at`, present on every table, both on the database's clock: a row
 * created and a row changed compare right, whatever the clock of the server that wrote them.
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
};
