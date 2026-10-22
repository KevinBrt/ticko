import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { schema, uuidv7 } from '@toppo/db';
import {
  apiErrorSchema,
  assignableRolesResponseSchema,
  projectCandidatesResponseSchema,
  projectMembersResponseSchema,
  projectResponseSchema,
  projectsResponseSchema,
} from '@toppo/shared';
import { eq } from 'drizzle-orm';
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
let memberCookie: string;
let outsiderCookie: string;
let managerCookie: string;
let memberId: string;
let outsiderId: string;
let managerId: string;
/** A role for project managers: they manage members and read issues, nothing more. */
let managerRoleId: string;
let deleterRoleId: string;

const ORIGIN = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';

/** Sign-in is rate limited to 5 per minute: this file signs in 4 times in all. */
function signIn(email: string) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    headers: { origin: ORIGIN },
    body: { email, password: PASSWORD },
  });
}

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  cookie: string,
  body?: object,
) {
  return app.inject({
    method,
    url,
    headers: { origin: ORIGIN, cookie },
    ...(body ? { body } : {}),
  });
}

const errorCode = (response: { json: () => unknown }) =>
  apiErrorSchema.parse(response.json()).error.code;

async function createProject(key: string, cookie = adminCookie): Promise<void> {
  const response = await call('POST', '/api/v1/projects', cookie, { key, name: `Project ${key}` });
  expect(response.statusCode).toBe(201);
}

async function listKeys(cookie: string, query = ''): Promise<string[]> {
  const response = await call('GET', `/api/v1/projects${query}`, cookie);
  expect(response.statusCode).toBe(200);
  return projectsResponseSchema.parse(response.json()).rows.map(({ key }) => key);
}

async function join(projectKey: string, userId: string, roleId: string | null = null) {
  const response = await call('POST', `/api/v1/projects/${projectKey}/members`, adminCookie, {
    userIds: [userId],
    roleId,
  });
  expect(response.statusCode).toBe(204);
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
  const { db } = context.database;
  managerRoleId = uuidv7();
  deleterRoleId = uuidv7();
  await db.insert(schema.roles).values([
    { id: managerRoleId, name: 'Manager', permissions: ['issue.read', 'project.members.manage'] },
    { id: deleterRoleId, name: 'Deleter', permissions: ['issue.read', 'issue.delete'] },
  ]);
  const person = (name: string, email: string) =>
    createTestUser(context.database, {
      name,
      email,
      password: PASSWORD,
      instanceRoleId: DEFAULT_ROLE_IDS.team,
    });
  memberId = await person('Grace Hopper', 'grace@example.com');
  outsiderId = await person('Alan Turing', 'alan@example.com');
  managerId = await person('Barbara Liskov', 'barbara@example.com');
  adminCookie = cookieHeader(await signIn('ada@example.com'));
  memberCookie = cookieHeader(await signIn('grace@example.com'));
  outsiderCookie = cookieHeader(await signIn('alan@example.com'));
  managerCookie = cookieHeader(await signIn('barbara@example.com'));

  await createProject('WEB');
  await join('WEB', memberId);
  await join('WEB', managerId, managerRoleId);
  return () => app.close();
});

describe('creating and listing projects', () => {
  it('creates a project its creator has access to', async () => {
    await createProject('API', memberCookie);

    expect(await listKeys(memberCookie)).toStrictEqual(['API', 'WEB']);
  });

  it('refuses a key another project has', async () => {
    const response = await call('POST', '/api/v1/projects', adminCookie, {
      key: 'WEB',
      name: 'Another website',
    });

    expect(response.statusCode).toBe(409);
    expect(errorCode(response)).toBe('PROJECT_KEY_TAKEN');
  });

  it.each([{ key: 'web', name: 'Lower case' }, { key: 'WEB-2', name: 'Dash' }, { key: 'OK' }])(
    'refuses an invalid project: %j',
    async (body) => {
      const response = await call('POST', '/api/v1/projects', adminCookie, body);

      expect(response.statusCode).toBe(400);
    },
  );

  it('lists only the projects one reaches, filtered in the query', async () => {
    await createProject('HR');

    expect(await listKeys(outsiderCookie)).toStrictEqual([]);
    expect(await listKeys(memberCookie)).toStrictEqual(['API', 'WEB']);
    expect(await listKeys(adminCookie)).toStrictEqual(['API', 'HR', 'WEB']);
    await context.database.db
      .update(schema.users)
      .set({ allProjects: true })
      .where(eq(schema.users.id, outsiderId));
    expect(await listKeys(outsiderCookie)).toStrictEqual(['API', 'HR', 'WEB']);
    await context.database.db
      .update(schema.users)
      .set({ allProjects: false })
      .where(eq(schema.users.id, outsiderId));
  });

  it('searches keys and names on the server', async () => {
    expect(await listKeys(adminCookie, '?search=project%20h')).toStrictEqual(['HR']);
    expect(await listKeys(adminCookie, '?search=ap')).toStrictEqual(['API']);
  });
});

describe('a project’s settings', () => {
  it('show a member the project and what they may do in it', async () => {
    const response = await call('GET', '/api/v1/projects/WEB', memberCookie);

    expect(projectResponseSchema.parse(response.json())).toMatchObject({
      key: 'WEB',
      name: 'Project WEB',
      archived: false,
      keyEditable: true,
      permissions: [
        'issue.read',
        'issue.read.own',
        'issue.create',
        'issue.update',
        'issue.assign',
        'comment.create',
      ],
    });
  });

  it('answer 404 to someone who cannot reach the project, existing or not', async () => {
    for (const key of ['WEB', 'NOWHERE']) {
      const response = await call('GET', `/api/v1/projects/${key}`, outsiderCookie);
      expect(response.statusCode).toBe(404);
      expect(errorCode(response)).toBe('PROJECT_NOT_FOUND');
    }
  });

  it('change the name, the description and the key until the first issue', async () => {
    await createProject('DOCS');
    const renamed = await call('PATCH', '/api/v1/projects/DOCS', adminCookie, {
      key: 'MANUAL',
      name: '  User manual ',
      description: 'How to use Toppo',
    });

    expect(renamed.statusCode).toBe(204);
    const project = projectResponseSchema.parse(
      (await call('GET', '/api/v1/projects/MANUAL', adminCookie)).json(),
    );
    expect(project).toMatchObject({ name: 'User manual', description: 'How to use Toppo' });
  });

  it('keep the key once an issue was numbered, and refuse one already taken', async () => {
    await context.database.db
      .update(schema.projects)
      .set({ nextIssueNumber: 2 })
      .where(eq(schema.projects.key, 'MANUAL'));
    const fixed = await call('PATCH', '/api/v1/projects/MANUAL', adminCookie, {
      key: 'GUIDE',
      name: 'User manual',
      description: '',
    });
    const taken = await call('PATCH', '/api/v1/projects/HR', adminCookie, {
      key: 'WEB',
      name: 'People',
      description: '',
    });

    expect(fixed.statusCode).toBe(409);
    expect(errorCode(fixed)).toBe('PROJECT_KEY_FIXED');
    expect(taken.statusCode).toBe(409);
    expect(errorCode(taken)).toBe('PROJECT_KEY_TAKEN');
  });

  it('archive a project: out of the list, read-only, until unarchived', async () => {
    expect((await call('POST', '/api/v1/projects/HR/archive', adminCookie)).statusCode).toBe(204);

    expect(await listKeys(adminCookie)).not.toContain('HR');
    const archived = projectsResponseSchema.parse(
      (await call('GET', '/api/v1/projects?state=archived', adminCookie)).json(),
    );
    expect(archived.rows.map(({ key }) => key)).toStrictEqual(['HR']);
    expect(archived.counts).toStrictEqual({ active: 3, archived: 1 });
    const edit = await call('PATCH', '/api/v1/projects/HR', adminCookie, {
      key: 'HR',
      name: 'People',
      description: '',
    });
    expect(edit.statusCode).toBe(409);
    expect(errorCode(edit)).toBe('PROJECT_ARCHIVED');

    expect((await call('POST', '/api/v1/projects/HR/unarchive', adminCookie)).statusCode).toBe(204);
    expect(await listKeys(adminCookie)).toContain('HR');
  });
});

describe('a project’s members', () => {
  it('list the members with their own role and the one the project gives', async () => {
    const response = await call('GET', '/api/v1/projects/WEB/members', managerCookie);

    expect(response.statusCode).toBe(200);
    const { rows, matching } = projectMembersResponseSchema.parse(response.json());
    expect(matching).toBe(3);
    expect(rows.find(({ userId }) => userId === managerId)).toMatchObject({
      ownRole: { id: DEFAULT_ROLE_IDS.team },
      projectRole: { id: managerRoleId, name: 'Manager' },
    });
    expect(rows.find(({ userId }) => userId === memberId)?.projectRole).toBeNull();
  });

  it('offer the roles a manager may give: none granting more than they hold', async () => {
    const response = await call('GET', '/api/v1/projects/WEB/roles', managerCookie);

    const roles = assignableRolesResponseSchema.parse(response.json()).roles;
    expect(roles.map(({ id }) => id)).toStrictEqual([managerRoleId]);
  });

  it('suggest people to add: active members not in the project yet', async () => {
    await context.database.db.insert(schema.users).values({
      name: 'Ann Former',
      email: 'ann@example.com',
      instanceRoleId: DEFAULT_ROLE_IDS.team,
      deactivatedAt: new Date(),
    });
    const response = await call('GET', '/api/v1/projects/WEB/candidates?search=a', managerCookie);

    // Ada created the project and Grace and Barbara were added: they are in. Ann is deactivated.
    expect(
      projectCandidatesResponseSchema.parse(response.json()).people.map(({ name }) => name),
    ).toStrictEqual(['Alan Turing']);
  });

  it('let a manager add someone with a role within theirs, never beyond', async () => {
    const beyond = await call('POST', '/api/v1/projects/WEB/members', managerCookie, {
      userIds: [outsiderId],
      roleId: deleterRoleId,
    });
    const ownRoleBeyond = await call('POST', '/api/v1/projects/WEB/members', managerCookie, {
      userIds: [outsiderId],
      roleId: null,
    });
    const within = await call('POST', '/api/v1/projects/WEB/members', managerCookie, {
      userIds: [outsiderId],
      roleId: managerRoleId,
    });

    expect(beyond.statusCode).toBe(403);
    expect(errorCode(beyond)).toBe('ROLE_BEYOND_YOURS');
    // The Team role creates issues, which the manager may not: it cannot apply here either.
    expect(ownRoleBeyond.statusCode).toBe(403);
    expect(within.statusCode).toBe(204);
    expect((await call('GET', '/api/v1/projects/WEB', outsiderCookie)).statusCode).toBe(200);
  });

  it('change and remove members, never one holding more than the manager there', async () => {
    const onMember = await call(
      'DELETE',
      `/api/v1/projects/WEB/members/${memberId}`,
      managerCookie,
    );
    expect(onMember.statusCode).toBe(403);

    const changed = await call('PATCH', `/api/v1/projects/WEB/members/${memberId}`, adminCookie, {
      roleId: deleterRoleId,
    });
    expect(changed.statusCode).toBe(204);
    const member = projectResponseSchema.parse(
      (await call('GET', '/api/v1/projects/WEB', memberCookie)).json(),
    );
    expect(member.permissions).toStrictEqual(['issue.read', 'issue.delete']);

    const removed = await call(
      'DELETE',
      `/api/v1/projects/WEB/members/${outsiderId}`,
      managerCookie,
    );
    expect(removed.statusCode).toBe(204);
    expect((await call('GET', '/api/v1/projects/WEB', outsiderCookie)).statusCode).toBe(404);
  });

  it('answer 404 for someone who is not a member', async () => {
    const response = await call(
      'DELETE',
      `/api/v1/projects/WEB/members/${outsiderId}`,
      adminCookie,
    );

    expect(response.statusCode).toBe(404);
    expect(errorCode(response)).toBe('MEMBER_NOT_FOUND');
  });

  it('keep a role given in a project from being deleted', async () => {
    const response = await call('DELETE', `/api/v1/roles/${deleterRoleId}`, adminCookie);

    expect(response.statusCode).toBe(409);
    expect(errorCode(response)).toBe('ROLE_IN_USE');
  });
});
