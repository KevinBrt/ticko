import { PALETTE_COLORS } from '@toppo/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.ts';
import { id, timestamps } from './columns.ts';
import { projects } from './projects.ts';
import { statuses } from './workflows.ts';

/** Exactly four levels, each with its own icon and color: the administrator only renames them. */
export const priorities = pgTable(
  'priorities',
  {
    id: id(),
    /** 1 (lowest) to 4 (highest). */
    level: integer('level').notNull(),
    name: text('name').notNull(),
    /** What new issues get. */
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('priorities_level_unique').on(table.level),
    check('priorities_level_check', sql`${table.level} between 1 and 4`),
    check('priorities_name_not_blank', sql`btrim(${table.name}) <> ''`),
    uniqueIndex('priorities_single_default').on(table.isDefault).where(sql`${table.isDefault}`),
  ],
);

/** What an issue is about (Bug, Request, Question…): one list for the whole instance. */
export const issueCategories = pgTable(
  'issue_categories',
  {
    id: id(),
    name: text('name').notNull(),
    color: text('color', { enum: PALETTE_COLORS }).notNull().default('gray'),
    position: integer('position').notNull(),
    /** What new issues get. */
    isDefault: boolean('is_default').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    check('issue_categories_name_not_blank', sql`btrim(${table.name}) <> ''`),
    check(
      'issue_categories_color_check',
      sql`${table.color} in ('gray', 'blue', 'green', 'amber', 'violet', 'cyan', 'orange', 'pink')`,
    ),
    check('issue_categories_position_check', sql`${table.position} >= 0`),
    uniqueIndex('issue_categories_name_unique').on(sql`lower(${table.name})`),
    uniqueIndex('issue_categories_single_default')
      .on(table.isDefault)
      .where(sql`${table.isDefault}`),
  ],
);

/** An issue, known to people by its key: the project's key and its number (`WEB-42`). */
export const issues = pgTable(
  'issues',
  {
    id: id(),
    /** Deleted with their project by the command made for it, never by a cascade. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    number: integer('number').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => issueCategories.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    /** Markdown. */
    description: text('description').notNull().default(''),
    statusId: uuid('status_id')
      .notNull()
      .references(() => statuses.id, { onDelete: 'restrict' }),
    priorityId: uuid('priority_id')
      .notNull()
      .references(() => priorities.id, { onDelete: 'restrict' }),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'restrict' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** Set while the issue's status is in the done category. */
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    unique('issues_project_number_unique').on(table.projectId, table.number),
    check('issues_number_positive', sql`${table.number} >= 1`),
    check('issues_title_not_blank', sql`btrim(${table.title}) <> ''`),
    // Mirror ISSUE_TITLE_MAX_LENGTH and ISSUE_DESCRIPTION_MAX_LENGTH (`@toppo/shared`).
    check('issues_title_length', sql`char_length(${table.title}) <= 200`),
    check('issues_description_length', sql`char_length(${table.description}) <= 50000`),
    index('issues_category_id_idx').on(table.categoryId),
    index('issues_status_id_idx').on(table.statusId),
    index('issues_priority_id_idx').on(table.priorityId),
    index('issues_assignee_id_idx').on(table.assigneeId),
    index('issues_reporter_id_idx').on(table.reporterId),
  ],
);

/**
 * What happened to issues, written in the same transaction as each change: the one source of
 * history, notifications, webhooks and plugins. Never updated.
 */
export const activities = pgTable(
  'activities',
  {
    id: id(),
    /** Deleted with their project by the command made for it, never by a cascade. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    /**
     * Gone with their issue. The deletion itself is recorded without an issue, its key in the
     * payload.
     */
    issueId: uuid('issue_id').references(() => issues.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    /** `issue.created`, `issue.statusChanged`…: each type has its own payload schema. */
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index('activities_issue_id_created_at_idx').on(table.issueId, table.createdAt),
    index('activities_project_id_idx').on(table.projectId),
    index('activities_actor_id_idx').on(table.actorId),
  ],
);
