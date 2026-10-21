import type { InstanceAccounts } from '@toppo/core';
import { schema } from '@toppo/db';
import { sql } from 'drizzle-orm';
import type { Transaction } from '../cqrs/cqrs.ts';

const { roles, users } = schema;

/** Arbitrary but fixed: identifies changes to who administers the instance. */
const ADMINISTRATION_LOCK_KEY = 7_461_756_324;

/**
 * Locks, for the rest of the transaction, every change that could leave the instance without an
 * administrator, then reads who holds which role. Two administrators demoting each other at the
 * same moment are serialized: the second one sees the first change.
 */
export async function lockInstanceAccounts(tx: Transaction): Promise<InstanceAccounts> {
  await tx.execute(sql`select pg_advisory_xact_lock(${ADMINISTRATION_LOCK_KEY})`);
  const accounts = await tx
    .select({ id: users.id, roleId: users.instanceRoleId, deactivatedAt: users.deactivatedAt })
    .from(users);
  const allRoles = await tx.select({ id: roles.id, grantsAll: roles.grantsAll }).from(roles);
  return {
    users: accounts.map(({ id, roleId, deactivatedAt }) => ({
      id,
      roleId,
      active: deactivatedAt === null,
    })),
    roles: allRoles,
  };
}
