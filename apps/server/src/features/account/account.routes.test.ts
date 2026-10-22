import { apiErrorSchema, meResponseSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  cookieHeader,
  setupTestDatabase,
  TEST_SETUP_CODE,
} from '../../test-helpers.ts';

const context = setupTestDatabase();
let app: FastifyInstance;
let cookie: string;

const ORIGIN = 'http://localhost:3000';
const ADA = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct horse battery staple',
};

function rename(body: object, sessionCookie = cookie) {
  return app.inject({
    method: 'PATCH',
    url: '/api/v1/me',
    headers: { origin: ORIGIN, cookie: sessionCookie },
    body,
  });
}

beforeAll(async () => {
  app = await buildTestApp({ database: context.database });
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    body: { setupCode: TEST_SETUP_CODE, admin: ADA },
  });
  expect(setup.statusCode).toBe(201);
  const signIn = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: ORIGIN },
    body: { email: ADA.email, password: ADA.password },
  });
  cookie = cookieHeader(signIn);
  return () => app.close();
});

describe('PATCH /api/v1/me', () => {
  it('renames the signed-in user, trimmed', async () => {
    const response = await rename({ name: '  Augusta Ada King  ' });

    expect(response.statusCode).toBe(204);
    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });
    expect(meResponseSchema.parse(me.json()).user).toMatchObject({
      name: 'Augusta Ada King',
      email: ADA.email,
    });
  });

  it('never changes the address, whatever the body says', async () => {
    const response = await rename({ name: 'Ada', email: 'mallory@example.com' });

    expect(response.statusCode).toBe(204);
    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });
    expect(meResponseSchema.parse(me.json()).user?.email).toBe(ADA.email);
  });

  it.each([{ name: '   ' }, { name: 'x'.repeat(101) }, {}])('refuses %j', async (body) => {
    const response = await rename(body);

    expect(response.statusCode).toBe(400);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
  });

  it('needs a session', async () => {
    const response = await rename({ name: 'Mallory' }, '');

    expect(response.statusCode).toBe(401);
  });
});
