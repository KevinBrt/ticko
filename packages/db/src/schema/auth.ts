import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.ts';
import { roles } from './roles.ts';

/*
 * Tables required by Better Auth (users, sessions, accounts, verifications, rate limits).
 * Column names follow Better Auth's model fields; extra Toppo columns are marked as such.
 */

export const users = pgTable(
  'users',
  {
    id: id(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    /**
     * Toppo: the instance-level role, carrying global permissions. No default: whoever creates
     * the account (setup, invitation) chooses it, so deleting any role never breaks sign-ups.
     */
    instanceRoleId: uuid('instance_role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    /** Toppo: set while an administrator has deactivated the account. */
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    /**
     * Toppo: set once an administrator has deleted the account. Its personal data is erased but
     * the row stays, so that history keeps an author ("Deleted user").
     */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_email_lowercase', sql`${table.email} = lower(${table.email})`),
    // A deleted account can never sign in again.
    check(
      'users_deleted_are_deactivated',
      sql`${table.deletedAt} is null or ${table.deactivatedAt} is not null`,
    ),
    index('users_instance_role_id_idx').on(table.instanceRoleId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    token: text('token').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sessions_token_unique').on(table.token),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

/** Credentials: the password hash for email sign-in, tokens for future OIDC/SAML providers. */
export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    password: text('password'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('accounts_provider_account_unique').on(table.providerId, table.accountId),
    index('accounts_user_id_idx').on(table.userId),
  ],
);

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

/** Rate-limit counters, shared by every server process through PostgreSQL. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: id(),
    key: text('key').notNull(),
    count: integer('count').notNull(),
    lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
  },
  (table) => [uniqueIndex('rate_limits_key_unique').on(table.key)],
);
