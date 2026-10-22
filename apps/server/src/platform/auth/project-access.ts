import {
  can,
  isProjectPermission,
  type Permission,
  type ProjectPermission,
  parseIssueKey,
  projectPermissionsOf,
} from '@toppo/core';
import { type Db, schema } from '@toppo/db';
import { and, eq, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { HttpError } from '../http/http-error.ts';
import type { Actor } from './actor.ts';

const { projectMembers, projects, roles, users } = schema;
const ownRoles = alias(roles, 'own_roles');
const projectRoles = alias(roles, 'project_roles');

/** The project an operation is about, and what the actor may do in it. */
export interface ProjectContext {
  id: string;
  key: string;
  /** Read-only while archived. */
  archived: boolean;
  permissions: readonly ProjectPermission[];
}

/** The project key in a field of an input: the key itself, or the project part of an issue key. */
export function projectKeyIn(
  field: 'projectKey' | 'issueKey',
  value: string | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }
  return field === 'projectKey' ? value : (parseIssueKey(value)?.projectKey ?? null);
}

const notFound = () => new HttpError(404, 'PROJECT_NOT_FOUND', 'This project does not exist');

/**
 * The projects `actorId` reaches, as a condition on `projects`: through the system role, access
 * to every project, or a membership. Lists filter with it in SQL, never after loading.
 */
export function reachableBy(actorId: string): SQL {
  return sql`(
    exists (select 1 from ${users} join ${roles} on ${roles.id} = ${users.instanceRoleId}
      where ${users.id} = ${actorId} and (${roles.grantsAll} or ${users.allProjects}))
    or exists (select 1 from ${projectMembers}
      where ${projectMembers.projectId} = ${projects.id} and ${projectMembers.userId} = ${actorId})
  )`;
}

/** The project permissions that make someone a manager of a project: its screens are theirs. */
const MANAGING: readonly ProjectPermission[] = [
  'project.settings.manage',
  'project.members.manage',
];

/**
 * The projects whose settings or access `actorId` manages, as a condition on `projects`: the
 * system role manages them all; anyone else through the role they have there (`projectPermissionsOf`
 * in `@toppo/core`, in SQL).
 */
export function managedBy(actorId: string): SQL {
  // In a raw template Drizzle names an alias without its table: the joins spell both out.
  return sql`exists (
    select 1 from ${users}
      join ${roles} as own_roles on ${ownRoles.id} = ${users.instanceRoleId}
      left join ${projectMembers} on ${projectMembers.projectId} = ${projects.id}
        and ${projectMembers.userId} = ${users.id}
      left join ${roles} as project_roles on ${projectRoles.id} = ${projectMembers.roleId}
    where ${users.id} = ${actorId} and (
      ${ownRoles.grantsAll}
      or ((${projectMembers.id} is not null or ${users.allProjects}) and (
        coalesce(${projectRoles.grantsAll}, false)
        or coalesce(${projectRoles.permissions}, ${ownRoles.permissions})
          && array[${sql.join(
            MANAGING.map((permission) => sql`${permission}`),
            sql`, `,
          )}]::text[]
      ))
    )
  )`;
}

/**
 * The project with `key`, as `actor` may use it. A project out of the actor's reach answers like
 * one that does not exist, so that its very existence stays private; one they reach without
 * `permission` is forbidden. A project permission is looked up in the project, an instance one in
 * the actor's own role. One query: the project, the actor's role and their membership.
 */
export async function resolveProject(
  db: Db,
  actor: Actor,
  key: string | null,
  permission?: Permission,
): Promise<ProjectContext> {
  if (key === null) {
    throw notFound();
  }
  const [row] = await db
    .select({
      id: projects.id,
      key: projects.key,
      archivedAt: projects.archivedAt,
      allProjects: users.allProjects,
      ownRole: { grantsAll: ownRoles.grantsAll, permissions: ownRoles.permissions },
      membershipId: projectMembers.id,
      projectRole: { grantsAll: projectRoles.grantsAll, permissions: projectRoles.permissions },
    })
    .from(projects)
    .innerJoin(users, eq(users.id, actor.id))
    .innerJoin(ownRoles, eq(ownRoles.id, users.instanceRoleId))
    .leftJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, users.id)),
    )
    .leftJoin(projectRoles, eq(projectRoles.id, projectMembers.roleId))
    .where(eq(projects.key, key));
  const permissions = row
    ? projectPermissionsOf({
        role: row.ownRole,
        allProjects: row.allProjects,
        membership: row.membershipId === null ? null : { role: row.projectRole },
      })
    : null;
  if (!(row && permissions)) {
    throw notFound();
  }
  const granted = permission && isProjectPermission(permission) ? permissions : actor.permissions;
  if (permission && !can(granted, permission)) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have permission to do this');
  }
  return { id: row.id, key: row.key, archived: row.archivedAt !== null, permissions };
}
