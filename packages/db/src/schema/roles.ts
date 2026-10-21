import { PERMISSION_SCOPES, type Permission } from '@toppo/core';
import { sql } from 'drizzle-orm';
import { check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.ts';

/**
 * A role is a named set of permissions, granted at instance level (`users.instance_role_id`) or
 * inside a project (project members, later). Code checks permissions, never role names.
 */
export const roles = pgTable(
  'roles',
  {
    id: id(),
    name: text('name').notNull(),
    scope: text('scope', { enum: PERMISSION_SCOPES }).notNull(),
    permissions: text('permissions')
      .array()
      .$type<Permission[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    ...timestamps,
  },
  (table) => [
    check('roles_scope_check', sql`${table.scope} in ('instance', 'project')`),
    check('roles_name_not_blank', sql`btrim(${table.name}) <> ''`),
    uniqueIndex('roles_scope_name_unique').on(table.scope, sql`lower(${table.name})`),
  ],
);
