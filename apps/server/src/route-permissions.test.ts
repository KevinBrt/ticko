import { randomUUID } from 'node:crypto';
import {
  ALL_PERMISSIONS,
  canBeGranted,
  type InstancePermission,
  isInstancePermission,
} from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import { apiErrorSchema } from '@toppo/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  cookieHeader,
  createTestUser,
  setupTestDatabase,
  TEST_SETUP_CODE,
} from './test-helpers.ts';

/*
 * Generated from the routes the app registers: adding a route adds its tests. A route either
 * requires a permission, checked here both ways, or is listed below as open on purpose.
 */

const OPEN_API_ROUTES = [
  'GET /api/auth/get-session',
  'POST /api/auth/sign-in/email',
  'POST /api/auth/sign-out',
  'POST /api/v1/invitations/accept',
  'POST /api/v1/invitations/preview',
  'GET /api/v1/me',
  'GET /api/v1/setup',
  'POST /api/v1/setup',
];

/** Better Auth limits these itself (`platform/auth/auth.ts`). */
const DELEGATED_ROUTES = ['POST /api/auth/sign-in/email', 'POST /api/auth/sign-out'];

const ROUTES = await (async () => {
  const app = await buildTestApp();
  const contracts = app.routeContracts.filter(
    (route) => route.method !== 'HEAD' && route.url.startsWith('/api/'),
  );
  await app.close();
  return contracts;
})();

const GUARDED_ROUTES = ROUTES.flatMap(({ method, url, access }) =>
  typeof access === 'object' ? [{ method, url, permission: access.permission }] : [],
);

const INSTANCE_PERMISSIONS = ALL_PERMISSIONS.filter(isInstancePermission);
const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';

const context = setupTestDatabase();
let app: FastifyInstance;
/** A signed-in user whose role's permissions each test sets: one sign-in for the whole file. */
let probeCookie: string;
let probeRoleId: string;
/** The administrator, for the permissions no role but the system one may hold. */
let adminCookie: string;

beforeAll(async () => {
  app = await buildTestApp({ database: context.database });
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    body: {
      setupCode: TEST_SETUP_CODE,
      admin: { name: 'Ada Lovelace', email: 'ada@example.com', password: PASSWORD },
    },
  });
  expect(setup.statusCode).toBe(201);
  probeRoleId = uuidv7();
  await context.database.db.insert(schema.roles).values({ id: probeRoleId, name: 'Probe' });
  await createTestUser(context.database, {
    name: 'Probe',
    email: 'probe@example.com',
    password: PASSWORD,
    instanceRoleId: probeRoleId,
  });
  probeCookie = await signIn('probe@example.com');
  adminCookie = await signIn('ada@example.com');
  return () => app.close();
});

async function signIn(email: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: ORIGIN },
    body: { email, password: PASSWORD },
  });
  expect(response.statusCode).toBe(200);
  return cookieHeader(response);
}

async function grantProbe(permissions: InstancePermission[]): Promise<void> {
  await context.database.db
    .update(schema.roles)
    .set({ permissions })
    .where(eq(schema.roles.id, probeRoleId));
}

/** Calls a route with made-up parameters and an empty body: enough to get past or be stopped. */
function call(method: HTTPMethods, url: string, cookie = probeCookie) {
  return app.inject({
    method,
    url: url.replaceAll(/:\w+/g, () => randomUUID()),
    headers: { origin: ORIGIN, cookie },
    ...(method === 'GET' ? {} : { body: {} }),
  });
}

it('opens only the expected API routes without a permission', () => {
  const open = ROUTES.filter(({ access }) => typeof access === 'string').map(
    ({ method, url }) => `${method} ${url}`,
  );

  expect(open.sort()).toStrictEqual([...OPEN_API_ROUTES].sort());
  expect(GUARDED_ROUTES.length).toBeGreaterThan(0);
});

it('rate limits every public route that writes', () => {
  const unlimited = ROUTES.filter(
    ({ method, access, rateLimited }) => access === 'public' && method !== 'GET' && !rateLimited,
  ).map(({ method, url }) => `${method} ${url}`);

  expect(unlimited).toStrictEqual(DELEGATED_ROUTES);
});

describe.each(GUARDED_ROUTES)('$method $url', ({ method, url, permission }) => {
  it(`refuses a user who has every permission but ${permission}`, async () => {
    await grantProbe(INSTANCE_PERMISSIONS.filter((granted) => granted !== permission));
    const response = await call(method, url);

    expect(response.statusCode).toBe(403);
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('FORBIDDEN');
  });

  // No role but the system one may hold some permissions: an administrator must get through.
  const systemOnly = !canBeGranted(permission);
  it(
    systemOnly ? 'lets the system role through' : `lets a user with only ${permission} through`,
    async () => {
      if (!systemOnly) {
        await grantProbe([permission]);
      }
      const response = await call(method, url, systemOnly ? adminCookie : probeCookie);

      expect([401, 403]).not.toContain(response.statusCode);
    },
  );
});
