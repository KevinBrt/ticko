import { DEFAULT_ROLE_NAMES, DEFAULT_ROLES } from '@toppo/core';
import { schema } from '@toppo/db';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '../../../platform/cqrs/cqrs.ts';
import { setupTestDatabase, testServices } from '../../../test-helpers.ts';
import { completeSetup } from './complete-setup.command.ts';

const context = setupTestDatabase();
const SETUP_CODE = 'ABCD-EFGH-JKLM';

function executionContext(): ExecutionContext {
  return {
    db: context.database.db,
    actor: null,
    log: Fastify({ logger: false }).log,
    services: testServices({
      hashPassword: (password) => Promise.resolve(`hashed:${password}`),
      setupCode: SETUP_CODE,
    }),
  };
}

describe('completeSetup', () => {
  it('names the default roles in the administrator’s language', async () => {
    await completeSetup.execute(executionContext(), {
      setupCode: SETUP_CODE,
      admin: { name: 'Ada', email: 'ada@example.com', password: 'correct horse battery staple' },
      locale: 'fr',
    });

    const roles = await context.database.db
      .select({ id: schema.roles.id, name: schema.roles.name })
      .from(schema.roles);
    for (const role of DEFAULT_ROLES) {
      expect(roles.find(({ id }) => id === role.id)?.name).toBe(DEFAULT_ROLE_NAMES.fr[role.kind]);
    }
  });

  it('stores the hash produced by the password service, never the password', async () => {
    const [account] = await context.database.db.select().from(schema.accounts);

    expect(account?.password).toBe('hashed:correct horse battery staple');
  });
});
