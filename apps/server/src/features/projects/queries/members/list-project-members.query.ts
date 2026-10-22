import { containsText, schema } from '@toppo/db';
import {
  PROJECT_MEMBERS_PAGE_SIZE,
  type ProjectMembersResponse,
  projectKeyParamsSchema,
  projectMembersQuerySchema,
} from '@toppo/shared';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { defineQuery } from '../../../../platform/cqrs/cqrs.ts';

const { projectMembers, roles, users } = schema;
const projectRoles = alias(roles, 'project_roles');

/**
 * One page of the people listed as members of the project, with their own role and the one the
 * project gives them. Members given every project, and the system role, reach it without a line.
 */
export const listProjectMembers = defineQuery({
  name: 'project.listMembers',
  access: { project: 'projectKey', permission: 'project.members.manage' },
  input: projectKeyParamsSchema.extend(projectMembersQuerySchema.shape),
  async handler({ db, project }, { search, page }): Promise<ProjectMembersResponse> {
    const listed = and(
      eq(projectMembers.projectId, project.id),
      isNull(users.deletedAt),
      search ? containsText([users.name, users.email], search) : undefined,
    );
    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        ownRole: { id: roles.id, name: roles.name, color: roles.color },
        projectRole: { id: projectRoles.id, name: projectRoles.name, color: projectRoles.color },
        deactivatedAt: users.deactivatedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .innerJoin(roles, eq(roles.id, users.instanceRoleId))
      .leftJoin(projectRoles, eq(projectRoles.id, projectMembers.roleId))
      .where(listed)
      .orderBy(sql`lower(${users.name})`, users.id)
      .limit(PROJECT_MEMBERS_PAGE_SIZE)
      .offset((page - 1) * PROJECT_MEMBERS_PAGE_SIZE);
    const [total] = await db
      .select({ count: count() })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(listed);

    return {
      rows: rows.map(({ deactivatedAt, ...member }) => ({
        ...member,
        deactivatedAt: deactivatedAt?.toISOString() ?? null,
      })),
      matching: total?.count ?? 0,
      page,
      pageSize: PROJECT_MEMBERS_PAGE_SIZE,
    };
  },
});
