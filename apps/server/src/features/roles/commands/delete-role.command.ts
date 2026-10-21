import { schema } from '@toppo/db';
import { roleIdParamsSchema } from '@toppo/shared';
import { and, count, eq, isNull } from 'drizzle-orm';
import { defineCommand } from '../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../platform/http/http-error.ts';

const { invitations, roles, users } = schema;

/**
 * Deletes a role nobody holds: no member, even deactivated, and no pending invitation. Deleted
 * accounts and accepted invitations simply lose it. The database refuses the rest anyway.
 */
export const deleteRole = defineCommand({
  name: 'role.delete',
  access: { permission: 'instance.roles.manage' },
  input: roleIdParamsSchema,
  async handler({ tx, actor, log }, { roleId }): Promise<void> {
    // Locked: a member given this role meanwhile waits, then finds it gone.
    const [role] = await tx
      .select({ grantsAll: roles.grantsAll })
      .from(roles)
      .where(eq(roles.id, roleId))
      .for('update');
    if (!role) {
      throw new HttpError(404, 'ROLE_NOT_FOUND', 'This role does not exist');
    }
    if (role.grantsAll) {
      throw new HttpError(403, 'SYSTEM_ROLE_LOCKED', 'The system role cannot be deleted');
    }
    const [members] = await tx
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.instanceRoleId, roleId), isNull(users.deletedAt)));
    const [pending] = await tx
      .select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.roleId, roleId), isNull(invitations.acceptedAt)));
    if ((members?.count ?? 0) > 0 || (pending?.count ?? 0) > 0) {
      throw new HttpError(409, 'ROLE_IN_USE', 'Members or invitations still have this role');
    }

    await tx.delete(roles).where(eq(roles.id, roleId));
    log.info({ roleId, by: actor.id }, 'Role deleted');
  },
});
