import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTestApp, setupTestDatabase } from '../../test-helpers.ts';
import { serializerCompiler, validatorCompiler } from '../http/zod.ts';
import { type HealthDependencies, registerHealthRoute } from './health-route.ts';

const context = setupTestDatabase();
let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function buildHealthApp(dependencies: HealthDependencies): FastifyInstance {
  const instance = Fastify({ logger: false });
  instance.setValidatorCompiler(validatorCompiler);
  instance.setSerializerCompiler(serializerCompiler);
  registerHealthRoute(instance, dependencies);
  return instance;
}

describe('GET /health', () => {
  it('reports healthy against a real PostgreSQL', async () => {
    const { database } = context;
    app = await buildTestApp({ database, ping: () => database.ping() });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toStrictEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('answers 503 without details when the database fails', async () => {
    app = buildHealthApp({
      database: { ping: () => Promise.reject(new Error('password authentication failed')) },
    });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toStrictEqual({ status: 'error', checks: { database: 'error' } });
    expect(response.body).not.toContain('password');
  });

  it('answers 503 when the database hangs', async () => {
    app = buildHealthApp({
      database: { ping: () => new Promise(() => undefined) },
      checkTimeoutMs: 20,
    });
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
  });

  it('is public and requires no authentication', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
  });
});
