import { schema } from '@toppo/db';
import { eq } from 'drizzle-orm';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { setupTestDatabase } from '../../test-helpers.ts';
import type { Actor } from '../auth/actor.ts';
import { HttpError } from '../http/http-error.ts';
import { RequestValidationError } from '../http/zod.ts';
import { defineCommand, defineQuery, type ExecutionContext } from './cqrs.ts';

const context = setupTestDatabase();

const ADA: Actor = {
  id: '01a1569b-9900-7000-8000-000000000001',
  name: 'Ada',
  email: 'ada@example.com',
  permissions: ['project.create'],
};

function executionContext(actor: Actor | null = null): ExecutionContext {
  return {
    db: context.database.db,
    actor,
    log: Fastify({ logger: false }).log,
    services: { hashPassword: (password) => Promise.resolve(password), setupCode: 'unused' },
  };
}

const createRole = defineCommand({
  name: 'role.create',
  access: 'authenticated',
  input: z.object({ name: z.string().min(1), failAfterInsert: z.boolean().default(false) }),
  async handler({ tx }, { name, failAfterInsert }) {
    const [role] = await tx
      .insert(schema.roles)
      .values({ name, scope: 'project' })
      .returning({ id: schema.roles.id });
    if (failAfterInsert) {
      throw new Error('something failed after the insert');
    }
    return { id: role?.id };
  },
});

async function roleNamed(name: string) {
  return await context.database.db.select().from(schema.roles).where(eq(schema.roles.name, name));
}

describe('defineCommand', () => {
  it('runs the handler with validated input and returns its result', async () => {
    const result = await createRole.execute(executionContext(ADA), { name: 'Contractor' });

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await roleNamed('Contractor')).toHaveLength(1);
  });

  it('rolls everything back when the handler fails', async () => {
    await expect(
      createRole.execute(executionContext(ADA), { name: 'Half done', failAfterInsert: true }),
    ).rejects.toThrow('something failed after the insert');

    expect(await roleNamed('Half done')).toHaveLength(0);
  });

  it('refuses anonymous callers before looking at their input', async () => {
    const error = await createRole.execute(executionContext(null), { name: '' }).catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
  });

  it('validates input on every call, not only behind HTTP routes', async () => {
    const error = await createRole.execute(executionContext(ADA), { name: '' }).catch((e) => e);

    expect(error).toBeInstanceOf(RequestValidationError);
    expect(error.validationContext).toBe('input');
  });
});

describe('operations behind a permission', () => {
  const listUsers = defineQuery({
    name: 'user.list',
    access: { permission: 'instance.users.manage' },
    input: z.object({ limit: z.number().int() }),
    handler: () => Promise.resolve('listed'),
  });

  it('refuse an actor without the permission before looking at their input', async () => {
    const error = await listUsers.execute(executionContext(ADA), { limit: 0.5 }).catch((e) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('refuse anonymous callers as unauthenticated', async () => {
    const error = await listUsers.execute(executionContext(null), { limit: 1 }).catch((e) => e);

    expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED' });
  });

  it('run for an actor whose role grants the permission', async () => {
    const admin: Actor = { ...ADA, permissions: ['instance.users.manage'] };

    expect(await listUsers.execute(executionContext(admin), { limit: 1 })).toBe('listed');
  });

  it('expose their access, for the route that runs them', () => {
    expect(listUsers.access).toStrictEqual({ permission: 'instance.users.manage' });
  });
});

describe('defineQuery', () => {
  it('reads without a transaction, with parsed input', async () => {
    const handler = vi.fn(async ({ db }, { name }: { name: string }) => {
      const rows = await db.select().from(schema.roles).where(eq(schema.roles.name, name));
      return rows.length;
    });
    const countRoles = defineQuery({
      name: 'role.count',
      access: 'public',
      input: z.object({ name: z.string().trim() }),
      handler,
    });

    expect(await countRoles.execute(executionContext(), { name: '  Contractor ' })).toBe(1);
    expect(handler.mock.calls[0]?.[0]).not.toHaveProperty('tx');
  });
});
