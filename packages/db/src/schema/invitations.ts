import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.ts';
import { id, timestamps } from './columns.ts';
import { roles } from './roles.ts';

/**
 * An invitation to join the instance, accepted through a link the administrator passes on.
 * Only a hash of the link's token is stored: reading the database never gives a usable link.
 */
export const invitations = pgTable(
  'invitations',
  {
    id: id(),
    email: text('email').notNull(),
    /** The role the new member gets on accepting; an accepted invitation may lose it with its role. */
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    /** SHA-256 of the token, hex-encoded. */
    tokenHash: text('token_hash').notNull(),
    invitedById: uuid('invited_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Set once the invitation is used; accepted invitations stay as a record of who invited whom. */
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('invitations_token_hash_unique').on(table.tokenHash),
    // One pending invitation per address: inviting again replaces it.
    uniqueIndex('invitations_pending_email_unique')
      .on(table.email)
      .where(sql`${table.acceptedAt} is null`),
    index('invitations_role_id_idx').on(table.roleId),
    index('invitations_invited_by_id_idx').on(table.invitedById),
    check('invitations_email_lowercase', sql`${table.email} = lower(${table.email})`),
    check('invitations_expire_after_creation', sql`${table.expiresAt} > ${table.createdAt}`),
    // Deleting a role a pending invitation still gives fails here.
    check(
      'invitations_role_unless_accepted',
      sql`${table.roleId} is not null or ${table.acceptedAt} is not null`,
    ),
  ],
);
