import { schema } from '@toppo/db';
import { userIdParamsSchema } from '@toppo/shared';
import { eq } from 'drizzle-orm';
import { defineCommand } from '../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../platform/http/http-error.ts';

const { users } = schema;

/** Lets a deactivated account sign in again, with the role it had. */
export const reactivateUser = defineCommand({
  name: 'user.reactivate',
  access: { permission: 'instance.users.manage' },
  input: userIdParamsSchema,
  async handler({ tx, actor, log }, { userId }): Promise<void> {
    const updated = await tx
      .update(users)
      .set({ deactivatedAt: null })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (updated.length === 0) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'This user does not exist');
    }
    log.info({ userId, by: actor?.id }, 'User reactivated');
  },
});
