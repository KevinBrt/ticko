import { canActOnProjectMember, canGiveProjectRole, type RoleGrants } from '@toppo/core';
import { schema } from '@toppo/db';
import { addProjectMembersRequestSchema, projectKeyParamsSchema } from '@toppo/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { defineCommand, type Transaction } from '../../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../../platform/http/http-error.ts';

const { projectMembers, roles, users } = schema;

const beyondYours = () =>
  new HttpError(403, 'ROLE_BEYOND_YOURS', 'You cannot give more than you hold in this project');

const systemRoleHolder = () =>
  new HttpError(409, 'SYSTEM_ROLE_HOLDER', 'The system role has every permission in every project');

/**
 * Gives active members of the instance access to the project, with a role there or their own.
 * Nobody gets more rights in the project than whoever adds them holds. Those already in are left
 * as they are.
 */
export const addProjectMembers = defineCommand({
  name: 'project.addMembers',
  access: { project: 'projectKey', permission: 'project.members.manage' },
  input: projectKeyParamsSchema.extend(addProjectMembersRequestSchema.shape),
  async handler({ tx, actor, project, log }, { userIds, roleId }): Promise<void> {
    const role = roleId === null ? null : await givenRole(tx, roleId);
    if (role && !canGiveProjectRole(project.permissions, role)) {
      throw beyondYours();
    }
    const people = await tx
      .select({ grantsAll: roles.grantsAll, permissions: roles.permissions })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.instanceRoleId))
      .where(and(inArray(users.id, userIds), isNull(users.deletedAt), isNull(users.deactivatedAt)));
    if (people.length !== userIds.length) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'Someone to add is not an active member');
    }
    // The system role keeps every permission everywhere: a role of the project would mean nothing.
    if (role && people.some(({ grantsAll }) => grantsAll)) {
      throw systemRoleHolder();
    }
    // Without a role of the project, each one's own role applies there: it must stay within reach.
    if (people.some((ownRole) => !canActOnProjectMember(project.permissions, role ?? ownRole))) {
      throw beyondYours();
    }

    await tx
      .insert(projectMembers)
      .values(userIds.map((userId) => ({ projectId: project.id, userId, roleId })))
      .onConflictDoNothing({ target: [projectMembers.projectId, projectMembers.userId] });
    log.info({ projectId: project.id, count: userIds.length, by: actor.id }, 'Members added');
  },
});

/** The role to give, share-locked: it cannot be deleted before the memberships giving it exist. */
async function givenRole(tx: Transaction, roleId: string): Promise<RoleGrants> {
  const [role] = await tx
    .select({ grantsAll: roles.grantsAll, permissions: roles.permissions })
    .from(roles)
    .where(eq(roles.id, roleId))
    .for('key share');
  if (!role) {
    throw new HttpError(400, 'INVALID_ROLE', 'This role does not exist');
  }
  return role;
}
