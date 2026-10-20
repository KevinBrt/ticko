import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, setupTestDatabase, TEST_SETUP_CODE } from '../../test-helpers.ts';

const context = setupTestDatabase();
let app: FastifyInstance;

const ORIGIN = 'https://ticko.example.com';
const EMAIL = 'ada@example.com';
const PASSWORD = 'correct horse battery staple';

beforeAll(async () => {
  app = await buildTestApp({ database: context.database, publicUrl: ORIGIN });
  await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    headers: { origin: ORIGIN },
    body: {
      setupCode: TEST_SETUP_CODE,
      admin: { name: 'Ada', email: EMAIL, password: PASSWORD },
    },
  });
  return () => app.close();
});

describe('behind HTTPS', () => {
  it('marks the session cookie Secure with the __Secure- prefix', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { origin: ORIGIN },
      body: { email: EMAIL, password: PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const session = response.cookies.find((cookie) => cookie.name.endsWith('session_token'));
    expect(session?.name).toBe('__Secure-ticko.session_token');
    expect(session).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax' });
  });
});
