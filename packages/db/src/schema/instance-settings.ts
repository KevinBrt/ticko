import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { timestamps } from './columns.ts';

/** Settings of the instance, as a single row (id 1) created by the first migration. */
export const instanceSettings = pgTable(
  'instance_settings',
  {
    id: smallint('id').primaryKey().default(1),
    name: text('name').notNull(),
    /** Set once the first-run wizard has created the first administrator. */
    setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check('instance_settings_single_row', sql`${table.id} = 1`),
    check('instance_settings_name_not_blank', sql`btrim(${table.name}) <> ''`),
  ],
);

export const INSTANCE_SETTINGS_ID = 1;
