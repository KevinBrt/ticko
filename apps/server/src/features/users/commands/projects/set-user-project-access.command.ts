import { canActOnRole } from '@toppo/core';
import { schema } from '@toppo/db';
import { userIdParamsSchema, userProjectAccessRequestSchema } from '@toppo/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { defineCommand } from '../../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../../platform/http/http-error.ts';

const { roles, users } = schema;

/**
 * Gives a member access to every project, present and future, or back to the projects they are
 * in only.
 */
export const setUserProjectAccess = defineCommand({
  name: 'user.setProjectAccess',
  access: { permission: 'instance.users.manage' },
  input: userIdParamsSchema.extend(userProjectAccessRequestSchema.shape),
  async handler({ tx, actor, log }, { userId, allProjects }): Promise<void> {
    const [user] = await tx
      .select({ grantsAll: roles.grantsAll })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.instanceRoleId))
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'This user does not exist');
    }
    if (!canActOnRole(actor.permissions, user)) {
      throw new HttpError(403, 'SYSTEM_ROLE_RESERVED', 'Only administrators handle that role');
    }
    await tx.update(users).set({ allProjects }).where(eq(users.id, userId));
    log.info({ userId, allProjects, by: actor.id }, 'Project access changed');
  },
});
