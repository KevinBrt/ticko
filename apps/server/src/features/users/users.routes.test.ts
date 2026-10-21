import { DEFAULT_ROLE_IDS } from '@toppo/core';
import {
  apiErrorSchema,
  assignableRolesResponseSchema,
  meResponseSchema,
  usersResponseSchema,
} from '@toppo/shared';
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
let teamCookie: string;
let teamUserId: string;

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';
const ADMIN = { name: 'Ada Lovelace', email: 'ada@example.com' };
const TEAM_MEMBER = { name: 'Grace Hopper', email: 'grace@example.com' };
/** Lower case on purpose: names sort regardless of case. */
const REQUESTER = { name: 'alan Turing', email: 'alan@example.com' };
const UNKNOWN_USER_ID = '01a1569b-9900-7000-8000-00000000dead';

/** Sign-in is rate limited to 5 per minute: this file signs in 4 times in all. */
function signIn(email: string) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: ORIGIN },
    body: { email, password: PASSWORD },
  });
}

function call(method: 'GET' | 'PATCH' | 'POST', url: string, cookie: string, body?: object) {
  return app.inject({
    method,
    url,
    headers: { origin: ORIGIN, cookie },
    ...(body ? { body } : {}),
  });
}

const errorCode = (response: { json: () => unknown }) =>
  apiErrorSchema.parse(response.json()).error.code;

beforeAll(async () => {
  app = await buildTestApp({ database: context.database });
  const setup = await app.inject({
    method: 'POST',
    url: '/api/v1/setup',
    body: { setupCode: TEST_SETUP_CODE, admin: { ...ADMIN, password: PASSWORD } },
  });
  expect(setup.statusCode).toBe(201);
  teamUserId = await createTestUser(context.database, {
    ...TEAM_MEMBER,
    password: PASSWORD,
    instanceRoleId: DEFAULT_ROLE_IDS.team,
  });
  await createTestUser(context.database, {
    ...REQUESTER,
    password: PASSWORD,
    instanceRoleId: DEFAULT_ROLE_IDS.requester,
  });
  adminCookie = cookieHeader(await signIn(ADMIN.email));
  teamCookie = cookieHeader(await signIn(TEAM_MEMBER.email));
  return () => app.close();
});

describe('GET /api/v1/users', () => {
  it('lists every account by name, with its role and status only', async () => {
    const response = await call('GET', '/api/v1/users', adminCookie);

    expect(response.statusCode).toBe(200);
    const { users } = usersResponseSchema.parse(response.json());
    expect(users.map((user) => user.name)).toStrictEqual([
      'Ada Lovelace',
      'alan Turing',
      'Grace Hopper',
    ]);
    expect(users.find((user) => user.id === teamUserId)).toStrictEqual({
      id: teamUserId,
      ...TEAM_MEMBER,
      role: { id: DEFAULT_ROLE_IDS.team, name: 'Team', color: 'green' },
      deactivatedAt: null,
    });
    expect(Object.keys(response.json().users[0]).sort()).toStrictEqual([
      'deactivatedAt',
      'email',
      'id',
      'name',
      'role',
    ]);
  });

  it('is refused without a session, and to users who cannot manage users', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/users' })).statusCode).toBe(401);
    const forbidden = await call('GET', '/api/v1/users', teamCookie);

    expect(forbidden.statusCode).toBe(403);
    expect(errorCode(forbidden)).toBe('FORBIDDEN');
  });
});

describe('GET /api/v1/users/roles', () => {
  it('offers every role with its badge color, in creation order', async () => {
    const response = await call('GET', '/api/v1/users/roles', adminCookie);

    expect(response.statusCode).toBe(200);
    expect(assignableRolesResponseSchema.parse(response.json()).roles).toStrictEqual([
      { id: DEFAULT_ROLE_IDS.administrator, name: 'Administrator', color: 'blue' },
      { id: DEFAULT_ROLE_IDS.team, name: 'Team', color: 'green' },
      { id: DEFAULT_ROLE_IDS.requester, name: 'Requester', color: 'gray' },
    ]);
  });
});

describe('PATCH /api/v1/users/:userId', () => {
  const changeRole = (userId: string, roleId: string) =>
    call('PATCH', `/api/v1/users/${userId}`, adminCookie, { roleId });

  it('gives another role, which applies on the user’s next request', async () => {
    const response = await changeRole(teamUserId, DEFAULT_ROLE_IDS.requester);

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    const me = meResponseSchema.parse((await call('GET', '/api/v1/me', teamCookie)).json());
    expect(me.user?.permissions).toStrictEqual([]);

    expect((await changeRole(teamUserId, DEFAULT_ROLE_IDS.team)).statusCode).toBe(204);
  });

  it('refuses a role that does not exist', async () => {
    const response = await changeRole(teamUserId, UNKNOWN_USER_ID);

    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('INVALID_ROLE');
  });

  it('answers 404 for an unknown user and 400 for a malformed id', async () => {
    const unknown = await changeRole(UNKNOWN_USER_ID, DEFAULT_ROLE_IDS.team);
    const malformed = await changeRole('not-a-uuid', DEFAULT_ROLE_IDS.team);

    expect(unknown.statusCode).toBe(404);
    expect(errorCode(unknown)).toBe('USER_NOT_FOUND');
    expect(malformed.statusCode).toBe(400);
  });

  it('never demotes the last administrator', async () => {
    const admin = usersResponseSchema
      .parse((await call('GET', '/api/v1/users', adminCookie)).json())
      .users.find((user) => user.email === ADMIN.email);
    const response = await changeRole(admin?.id ?? '', DEFAULT_ROLE_IDS.team);

    expect(response.statusCode).toBe(409);
    expect(errorCode(response)).toBe('LAST_ADMINISTRATOR');
  });
});

describe('deactivating and reactivating a user', () => {
  const action = (verb: 'deactivate' | 'reactivate', userId = teamUserId) =>
    call('POST', `/api/v1/users/${userId}/${verb}`, adminCookie);

  it('is refused to users who cannot manage users', async () => {
    const response = await call('POST', `/api/v1/users/${teamUserId}/deactivate`, teamCookie);

    expect(response.statusCode).toBe(403);
  });

  it('signs the user out everywhere and keeps them out until reactivated', async () => {
    expect((await action('deactivate')).statusCode).toBe(204);

    const me = await call('GET', '/api/v1/me', teamCookie);
    expect(me.json()).toStrictEqual({ user: null });
    expect((await call('GET', '/api/v1/users', teamCookie)).statusCode).toBe(401);
    const users = usersResponseSchema.parse(
      (await call('GET', '/api/v1/users', adminCookie)).json(),
    );
    expect(users.users.find((user) => user.id === teamUserId)?.deactivatedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T.+Z$/,
    );

    const refused = await signIn(TEAM_MEMBER.email);
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toMatchObject({ code: 'ACCOUNT_DEACTIVATED' });
    expect(refused.cookies).toHaveLength(0);

    expect((await action('reactivate')).statusCode).toBe(204);
    expect((await signIn(TEAM_MEMBER.email)).statusCode).toBe(200);
  });

  it('answers 404 for an unknown user', async () => {
    expect((await action('deactivate', UNKNOWN_USER_ID)).statusCode).toBe(404);
    expect((await action('reactivate', UNKNOWN_USER_ID)).statusCode).toBe(404);
  });
});
