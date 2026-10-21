import { keepsAnAdministrator } from '@toppo/core';
import { schema } from '@toppo/db';
import { changeUserRoleRequestSchema, userIdParamsSchema } from '@toppo/shared';
import { eq } from 'drizzle-orm';
import { lockInstanceAccounts } from '../../../platform/auth/administrators.ts';
import { defineCommand } from '../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../platform/http/http-error.ts';

const { users } = schema;

/** Gives a user another instance role. Takes effect on their next request. */
export const changeUserRole = defineCommand({
  name: 'user.changeRole',
  access: { permission: 'instance.users.manage' },
  input: userIdParamsSchema.extend(changeUserRoleRequestSchema.shape),
  async handler({ tx, actor, log }, { userId, roleId }): Promise<void> {
    const accounts = await lockInstanceAccounts(tx);
    if (!accounts.users.some((user) => user.id === userId)) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'This user does not exist');
    }
    if (!accounts.roles.some((candidate) => candidate.id === roleId)) {
      throw new HttpError(400, 'INVALID_ROLE', 'This role does not exist');
    }
    if (!keepsAnAdministrator(accounts, { type: 'changeRole', userId, roleId })) {
      throw new HttpError(409, 'LAST_ADMINISTRATOR', 'The instance must keep an administrator');
    }
    await tx.update(users).set({ instanceRoleId: roleId }).where(eq(users.id, userId));
    log.info({ userId, roleId, by: actor?.id }, 'Instance role changed');
  },
});
