import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import Fastify from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../../../platform/auth/actor.ts';
import type { ExecutionContext } from '../../../platform/cqrs/cqrs.ts';
import { setupTestDatabase, testServices } from '../../../test-helpers.ts';
import { createInvitations } from './create-invitations.command.ts';
import { renewInvitation } from './renew-invitation.command.ts';
import { revokeInvitation } from './revoke-invitation.command.ts';

const context = setupTestDatabase();
let manager: Actor;
let administrator: Actor;

function executionContext(actor: Actor): ExecutionContext {
  return {
    db: context.database.db,
    actor,
    log: Fastify({ logger: false }).log,
    services: testServices(),
  };
}

async function insertActor(instanceRoleId: string, permissions: Actor['permissions']) {
  const id = uuidv7();
  await context.database.db
    .insert(schema.users)
    .values({ id, name: `User ${id}`, email: `${id}@example.com`, instanceRoleId });
  return { id, name: `User ${id}`, email: `${id}@example.com`, permissions };
}

beforeAll(async () => {
  // Manages members through a custom role, without holding the system role.
  manager = await insertActor(DEFAULT_ROLE_IDS.team, ['instance.users.manage']);
  administrator = await insertActor(DEFAULT_ROLE_IDS.administrator, [
    'instance.users.manage',
    'instance.roles.manage',
  ]);
});

describe('invitations to the system role', () => {
  it('are for administrators to send', async () => {
    await expect(
      createInvitations.execute(executionContext(manager), {
        emails: ['boss@example.com'],
        roleId: DEFAULT_ROLE_IDS.administrator,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'SYSTEM_ROLE_RESERVED' });

    await expect(
      createInvitations.execute(executionContext(manager), {
        emails: ['colleague@example.com'],
        roleId: DEFAULT_ROLE_IDS.team,
      }),
    ).resolves.toMatchObject({ alreadyMembers: [] });
  });

  it('are for administrators to renew or revoke', async () => {
    const { invitations } = await createInvitations.execute(executionContext(administrator), {
      emails: ['deputy@example.com'],
      roleId: DEFAULT_ROLE_IDS.administrator,
    });
    const invitationId = invitations[0]?.id ?? '';

    await expect(
      renewInvitation.execute(executionContext(manager), { invitationId }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ROLE_RESERVED' });
    await expect(
      revokeInvitation.execute(executionContext(manager), { invitationId }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ROLE_RESERVED' });
    await expect(
      revokeInvitation.execute(executionContext(administrator), { invitationId }),
    ).resolves.toBeUndefined();
  });
});
