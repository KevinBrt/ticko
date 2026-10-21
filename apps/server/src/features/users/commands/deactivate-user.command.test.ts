import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import { eq } from 'drizzle-orm';
import Fastify from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../../../platform/auth/actor.ts';
import type { ExecutionContext } from '../../../platform/cqrs/cqrs.ts';
import { setupTestDatabase } from '../../../test-helpers.ts';
import { deactivateUser } from './deactivate-user.command.ts';

const context = setupTestDatabase();
/** The only administrator of the instance. */
let adminId: string;

function executionContext(actor: Actor): ExecutionContext {
  return {
    db: context.database.db,
    actor,
    log: Fastify({ logger: false }).log,
    services: { hashPassword: (password) => Promise.resolve(password), setupCode: 'unused' },
  };
}

/** May manage users, but not roles: not an administrator in the sense of the last-admin rule. */
const userManager = (id: string): Actor => ({
  id,
  name: 'Manager',
  email: 'manager@example.com',
  permissions: ['instance.users.manage'],
});

async function insertUser(instanceRoleId: string): Promise<string> {
  const id = uuidv7();
  await context.database.db
    .insert(schema.users)
    .values({ id, name: `User ${id}`, email: `${id}@example.com`, instanceRoleId });
  return id;
}

async function deactivatedAt(userId: string): Promise<Date | null | undefined> {
  const [user] = await context.database.db
    .select({ deactivatedAt: schema.users.deactivatedAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return user?.deactivatedAt;
}

beforeAll(async () => {
  adminId = await insertUser(DEFAULT_ROLE_IDS.administrator);
});

describe('deactivateUser', () => {
  it('refuses to deactivate one’s own account', async () => {
    await expect(
      deactivateUser.execute(executionContext(userManager(adminId)), { userId: adminId }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CANNOT_DEACTIVATE_SELF' });
    expect(await deactivatedAt(adminId)).toBeNull();
  });

  it('never deactivates the last administrator, whoever asks', async () => {
    const managerId = await insertUser(DEFAULT_ROLE_IDS.team);

    await expect(
      deactivateUser.execute(executionContext(userManager(managerId)), { userId: adminId }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'LAST_ADMINISTRATOR' });
    expect(await deactivatedAt(adminId)).toBeNull();
  });

  it('keeps the first deactivation date when asked twice', async () => {
    const userId = await insertUser(DEFAULT_ROLE_IDS.team);
    const run = () => deactivateUser.execute(executionContext(userManager(adminId)), { userId });

    await run();
    const first = await deactivatedAt(userId);
    await run();

    expect(first).toBeInstanceOf(Date);
    expect(await deactivatedAt(userId)).toStrictEqual(first);
  });
});
