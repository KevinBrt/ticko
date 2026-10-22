import { describe, expect, it } from 'vitest';
import {
  userProjectAccessRequestSchema,
  userProjectParamsSchema,
} from '../members/project-access.ts';
import {
  addProjectMembersRequestSchema,
  changeProjectMemberRoleRequestSchema,
  pickerQuerySchema,
  projectMembersQuerySchema,
} from './members.ts';
import {
  createProjectRequestSchema,
  PROJECT_NAME_MAX_LENGTH,
  projectsQuerySchema,
  updateProjectRequestSchema,
} from './projects.ts';

const GRACE = '01a1569b-9900-7000-8000-000000000002';
const ALAN = '01a1569b-9900-7000-8000-000000000003';

describe('createProjectRequestSchema', () => {
  it('trims the name and defaults to no description', () => {
    expect(createProjectRequestSchema.parse({ key: 'WEB', name: '  Website ' })).toStrictEqual({
      key: 'WEB',
      name: 'Website',
      description: '',
    });
  });

  it.each([
    { key: 'web', name: 'Website' },
    { key: 'WEB', name: '   ' },
    { key: 'WEB', name: 'x'.repeat(PROJECT_NAME_MAX_LENGTH + 1) },
  ])('refuses %j', (body) => {
    expect(createProjectRequestSchema.safeParse(body).success).toBe(false);
  });

  it('asks for every field when updating', () => {
    expect(updateProjectRequestSchema.safeParse({ key: 'WEB', name: 'Website' }).success).toBe(
      false,
    );
  });
});

describe('list queries', () => {
  it('start on the first page of active projects', () => {
    expect(projectsQuerySchema.parse({})).toStrictEqual({ state: 'active', page: 1 });
    expect(projectsQuerySchema.parse({ state: 'archived', search: ' web ', page: '2' })).toEqual({
      state: 'archived',
      search: 'web',
      page: 2,
    });
    expect(projectsQuerySchema.safeParse({ state: 'deleted' }).success).toBe(false);
  });

  it('page a project’s members and search people to add', () => {
    expect(projectMembersQuerySchema.parse({ page: '3' })).toStrictEqual({ page: 3 });
    expect(pickerQuerySchema.parse({ search: ' ada ' })).toStrictEqual({ search: 'ada' });
    expect(pickerQuerySchema.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('managing a project’s members', () => {
  it('adds each person once, with a role of the project or their own', () => {
    expect(
      addProjectMembersRequestSchema.parse({ userIds: [GRACE, ALAN], roleId: null }),
    ).toStrictEqual({ userIds: [GRACE, ALAN], roleId: null });
    expect(
      addProjectMembersRequestSchema.safeParse({ userIds: [GRACE, GRACE], roleId: null }).success,
    ).toBe(false);
    expect(addProjectMembersRequestSchema.safeParse({ userIds: [], roleId: null }).success).toBe(
      false,
    );
  });

  it('gives a member back their own role with null', () => {
    expect(changeProjectMemberRoleRequestSchema.parse({ roleId: null })).toStrictEqual({
      roleId: null,
    });
  });
});

describe('a member’s access to projects', () => {
  it('names a member and a project by its key', () => {
    expect(userProjectParamsSchema.safeParse({ userId: GRACE, projectKey: 'WEB' }).success).toBe(
      true,
    );
    expect(userProjectParamsSchema.safeParse({ userId: GRACE, projectKey: 'web' }).success).toBe(
      false,
    );
    expect(userProjectAccessRequestSchema.parse({ allProjects: true })).toStrictEqual({
      allProjects: true,
    });
  });
});
