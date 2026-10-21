import { schema } from '@toppo/db';
import { apiErrorSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildTestApp, setupTestDatabase } from '../../test-helpers.ts';
import type { ZodTypeProvider } from './zod.ts';

const context = setupTestDatabase();
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp({ database: context.database });
  app.withTypeProvider<ZodTypeProvider>().post(
    '/api/test/limited',
    {
      config: { access: 'public', rateLimit: { max: 2, windowSeconds: 60 } },
      schema: { response: { 200: z.object({ ok: z.boolean() }) } },
    },
    () => ({ ok: true }),
  );
  return () => app.close();
});

function call(remoteAddress: string) {
  return app.inject({ method: 'POST', url: '/api/test/limited', remoteAddress });
}

describe('rate limited routes', () => {
  it('refuse a client past the limit, and say when to come back', async () => {
    expect((await call('203.0.113.1')).statusCode).toBe(200);
    expect((await call('203.0.113.1')).statusCode).toBe(200);
    const refused = await call('203.0.113.1');

    expect(refused.statusCode).toBe(429);
    expect(apiErrorSchema.parse(refused.json()).error.code).toBe('TOO_MANY_REQUESTS');
    expect(Number(refused.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('count each client address on its own', async () => {
    expect((await call('203.0.113.2')).statusCode).toBe(200);
  });

  it('start counting again once the window is over', async () => {
    await call('203.0.113.3');
    await call('203.0.113.3');
    expect((await call('203.0.113.3')).statusCode).toBe(429);

    // As if the window had started over a minute ago.
    await context.database.db.update(schema.rateLimits).set({ lastRequest: Date.now() - 61_000 });

    expect((await call('203.0.113.3')).statusCode).toBe(200);
  });
});
