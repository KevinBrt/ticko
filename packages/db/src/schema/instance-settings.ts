import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, timestamp } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.ts';

/** Settings of the instance, as a single row (id 1) created by the first migration. */
export const instanceSettings = pgTable(
  'instance_settings',
  {
    id: smallint('id').primaryKey().default(1),
    /** Set once the first-run wizard has created the first administrator. */
    setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [check('instance_settings_single_row', sql`${table.id} = 1`)],
);

export const INSTANCE_SETTINGS_ID = 1;
