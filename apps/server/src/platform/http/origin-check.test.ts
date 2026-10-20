import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildTestApp } from '../../test-helpers.ts';
import type { ZodTypeProvider } from './zod.ts';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp({ publicUrl: 'https://ticko.example.com' });
  app.withTypeProvider<ZodTypeProvider>().post(
    '/api/test/change',
    {
      config: { access: 'public' },
      schema: { response: { 200: z.object({ ok: z.boolean() }) } },
    },
    () => ({ ok: true }),
  );
});

afterAll(() => app.close());

function post(headers: Record<string, string>) {
  return app.inject({ method: 'POST', url: '/api/test/change', headers, body: {} });
}

describe('cross-origin guard', () => {
  it('accepts requests from the instance itself', async () => {
    const response = await post({
      origin: 'https://ticko.example.com',
      'sec-fetch-site': 'same-origin',
    });
    expect(response.statusCode).toBe(200);
  });

  it('accepts clients that are not browsers', async () => {
    expect((await post({})).statusCode).toBe(200);
  });

  it.each([
    { origin: 'https://evil.example.com' },
    { origin: 'http://ticko.example.com' },
    { origin: 'null' },
    { 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'same-site' },
  ])('refuses %j', async (headers) => {
    const response = await post(headers);

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CROSS_ORIGIN_REQUEST');
  });

  it('leaves reads alone', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    });
    expect(response.statusCode).toBe(200);
  });
});
