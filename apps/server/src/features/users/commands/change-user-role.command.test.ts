import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import { eq, sql } from 'drizzle-orm';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { Actor } from '../../../platform/auth/actor.ts';
import { lockInstanceAccounts } from '../../../platform/auth/administrators.ts';
import type { ExecutionContext } from '../../../platform/cqrs/cqrs.ts';
import { setupTestDatabase } from '../../../test-helpers.ts';
import { changeUserRole } from './change-user-role.command.ts';

const context = setupTestDatabase();
const { users } = schema;

function executionContext(actorId: string): ExecutionContext {
  return {
    db: context.database.db,
    actor: {
      id: actorId,
      name: 'Admin',
      email: 'admin@example.com',
      permissions: ['instance.users.manage', 'instance.roles.manage'],
    } satisfies Actor,
    log: Fastify({ logger: false }).log,
    services: { hashPassword: (password) => Promise.resolve(password), setupCode: 'unused' },
  };
}

async function insertAdministrator(): Promise<string> {
  const id = uuidv7();
  await context.database.db.insert(users).values({
    id,
    name: `Admin ${id}`,
    email: `${id}@example.com`,
    instanceRoleId: DEFAULT_ROLE_IDS.administrator,
  });
  return id;
}

/** Connections of this test database waiting for an advisory lock. */
async function waitingForAdvisoryLock(): Promise<number> {
  const [row] = await context.database.db.execute<{ count: string }>(
    sql`select count(*) as count from pg_stat_activity
        where datname = current_database() and wait_event_type = 'Lock' and wait_event = 'advisory'`,
  );
  return Number(row?.count);
}

describe('changeUserRole', () => {
  it('waits for a concurrent change of administrators, then takes it into account', async () => {
    const ada = await insertAdministrator();
    const alan = await insertAdministrator();
    let alanDemotesAda: Promise<void> | undefined;

    await context.database.db.transaction(async (tx) => {
      // Ada's change is under way: Alan is demoted but not committed yet…
      await lockInstanceAccounts(tx);
      await tx
        .update(users)
        .set({ instanceRoleId: DEFAULT_ROLE_IDS.team })
        .where(eq(users.id, alan));
      // …when Alan, still an administrator a moment ago, tries to demote Ada.
      alanDemotesAda = changeUserRole.execute(executionContext(alan), {
        userId: ada,
        roleId: DEFAULT_ROLE_IDS.team,
      });
      alanDemotesAda.catch(() => undefined);
      await expect.poll(waitingForAdvisoryLock).toBe(1);
    });

    await expect(alanDemotesAda).rejects.toMatchObject({
      statusCode: 409,
      code: 'LAST_ADMINISTRATOR',
    });
    const administrators = await context.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.instanceRoleId, DEFAULT_ROLE_IDS.administrator));
    expect(administrators).toStrictEqual([{ id: ada }]);
  });
});
