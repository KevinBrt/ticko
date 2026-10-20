import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from '../uuid.ts';

export const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** `created_at` and `updated_at`, present on every table. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
