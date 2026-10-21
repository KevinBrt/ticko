import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import { eq } from 'drizzle-orm';
import Fastify from 'fastify';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext, Services } from '../../../platform/cqrs/cqrs.ts';
import { setupTestDatabase, testServices } from '../../../test-helpers.ts';
import { acceptInvitation } from './accept-invitation.command.ts';
import { createInvitations } from './create-invitations.command.ts';

const context = setupTestDatabase();
const PASSWORD = 'correct horse battery staple';
let adminId: string;

function executionContext(services: Services = testServices()): ExecutionContext {
  return { db: context.database.db, actor: null, log: Fastify({ logger: false }).log, services };
}

async function invitationToken(email: string): Promise<string> {
  const { invitations } = await createInvitations.execute(
    {
      ...executionContext(),
      actor: {
        id: adminId,
        name: 'Admin',
        email: 'admin@example.com',
        permissions: ['instance.users.manage', 'instance.roles.manage'],
      },
    },
    { emails: [email], roleId: DEFAULT_ROLE_IDS.team },
  );
  return new URL(invitations[0]?.link ?? '').hash.slice(1);
}

beforeAll(async () => {
  adminId = uuidv7();
  await context.database.db.insert(schema.users).values({
    id: adminId,
    name: 'Admin',
    email: 'admin@example.com',
    instanceRoleId: DEFAULT_ROLE_IDS.administrator,
  });
});

describe('acceptInvitation', () => {
  it('hashes the password only once the link is known to be good', async () => {
    const hashPassword = vi.fn((password: string) => Promise.resolve(password));

    await expect(
      acceptInvitation.execute(executionContext(testServices({ hashPassword })), {
        token: 'a'.repeat(43),
        name: 'Nobody',
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'INVITATION_INVALID' });
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it('creates a single account when the same link is used twice at once', async () => {
    const token = await invitationToken('twice@example.com');
    const accept = () =>
      acceptInvitation.execute(executionContext(), { token, name: 'Twice', password: PASSWORD });

    const results = await Promise.allSettled([accept(), accept()]);

    expect(results.map((result) => result.status).sort()).toStrictEqual(['fulfilled', 'rejected']);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'INVITATION_INVALID' },
    });
    const accounts = await context.database.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, 'twice@example.com'));
    expect(accounts).toHaveLength(1);
  });
});
