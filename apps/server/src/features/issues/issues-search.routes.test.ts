import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { apiErrorSchema, ISSUE_SEARCH_LIMIT, issueSearchResponseSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  cookieHeader,
  createTestUser,
  setupTestDatabase,
  TEST_SETUP_CODE,
} from '../../test-helpers.ts';

const context = setupTestDatabase();
let app: FastifyInstance;
let adminCookie: string;
/** Team, a member of WEB only. */
let teamCookie: string;
/** Requester in WEB: sees their own issues only. */
let requesterCookie: string;

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';

function call(method: 'GET' | 'POST', url: string, cookie: string, body?: object) {
  return app.inject({
    method,
    url,
    headers: { origin: ORIGIN, ...(cookie ? { cookie } : {}) },
    ...(body ? { body } : {}),
  });
}

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

async function report(projectKey: string, issue: object, cookie = adminCookie): Promise<void> {
  const response = await call('POST', `/api/v1/projects/${projectKey}/issues`, cookie, issue);
  expect(response.statusCode).toBe(201);
}

/** The keys of the issues `search` finds, in order. */
async function found(search: string, cookie = adminCookie): Promise<string[]> {
  const response = await call(
    'GET',
    `/api/v1/issues/search?${new URLSearchParams({ search })}`,
    cookie,
  );
  expect(response.statusCode).toBe(200);
  return issueSearchResponseSchema.parse(response.json()).rows.map(({ key }) => key);
}

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
  const person = (name: string, email: string, instanceRoleId: string) =>
    createTestUser(context.database, { name, email, password: PASSWORD, instanceRoleId });
  const teamId = await person('Grace Hopper', 'grace@example.com', DEFAULT_ROLE_IDS.team);
  const requesterId = await person('Rita Client', 'rita@example.com', DEFAULT_ROLE_IDS.requester);
  adminCookie = await signIn('ada@example.com');
  teamCookie = await signIn('grace@example.com');
  requesterCookie = await signIn('rita@example.com');

  for (const key of ['WEB', 'API', 'OLD']) {
    expect(
      (await call('POST', '/api/v1/projects', adminCookie, { key, name: key })).statusCode,
    ).toBe(201);
  }
  const added = await call('POST', '/api/v1/projects/WEB/members', adminCookie, {
    userIds: [teamId, requesterId],
    roleId: null,
  });
  expect(added.statusCode).toBe(204);

  await report('WEB', { title: 'Crash on save' });
  await report('API', { title: 'Crash when saving a token' });
  await report('API', { title: 'Rate limit', description: 'Too many requests make it crash.' });
  await report(
    'WEB',
    { title: 'Typo on home', description: 'It may crash older browsers.' },
    requesterCookie,
  );
  await report('API', { title: 'Follow-up of API-2' });
  await report('OLD', { title: 'Crash in the old project' });
  expect((await call('POST', '/api/v1/projects/OLD/archive', adminCookie)).statusCode).toBe(204);
  return () => app.close();
});

describe('searching every project', () => {
  it('finds the issues of every project reached, title words first, then the latest', async () => {
    expect(await found('crash')).toStrictEqual(['API-1', 'WEB-1', 'WEB-2', 'API-2']);
  });

  it('puts the issue named by its key first', async () => {
    expect(await found('api-2')).toStrictEqual(['API-2', 'API-3']);
  });

  it('names no issue by its number alone, which every project has', async () => {
    expect(await found('1')).toStrictEqual([]);
  });

  it('leaves out archived projects, and those out of reach', async () => {
    expect(await found('OLD-1')).toStrictEqual([]);
    expect(await found('crash', teamCookie)).toStrictEqual(['WEB-1', 'WEB-2']);
    expect(await found('API-1', teamCookie)).toStrictEqual([]);
  });

  it('shows a requester their own issues only', async () => {
    expect(await found('crash', requesterCookie)).toStrictEqual(['WEB-2']);
  });

  it(`shows the best ${ISSUE_SEARCH_LIMIT} at most`, async () => {
    for (let index = 0; index <= ISSUE_SEARCH_LIMIT; index += 1) {
      await report('WEB', { title: `Flaky test ${index}` });
    }

    expect(await found('flaky')).toHaveLength(ISSUE_SEARCH_LIMIT);
  });
});

describe('a search it cannot read', () => {
  it.each(['', 'search=', 'search=%20%20', `search=${'a'.repeat(101)}`])(
    'refuses %j',
    async (query) => {
      const response = await call('GET', `/api/v1/issues/search?${query}`, adminCookie);

      expect(response.statusCode).toBe(400);
      expect(apiErrorSchema.parse(response.json()).error.code).toBe('VALIDATION_FAILED');
    },
  );

  it('needs a session', async () => {
    expect((await call('GET', '/api/v1/issues/search?search=crash', '')).statusCode).toBe(401);
  });
});
