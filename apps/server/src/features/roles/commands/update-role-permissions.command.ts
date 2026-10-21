import { permissionsOfRole, rolePermissionsFrom } from '@toppo/core';
import { schema } from '@toppo/db';
import { rolePermissionsRequestSchema } from '@toppo/shared';
import { eq, inArray } from 'drizzle-orm';
import { defineCommand } from '../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../platform/http/http-error.ts';

const { roles } = schema;

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return new Set(left).size === rightSet.size && left.every((value) => rightSet.has(value));
}

/**
 * Saves what the matrix changed, for every role at once or not at all. A role someone else
 * changed since the matrix was loaded is not overwritten: the whole save is refused.
 */
export const updateRolePermissions = defineCommand({
  name: 'role.updatePermissions',
  access: { permission: 'instance.roles.manage' },
  input: rolePermissionsRequestSchema,
  async handler({ tx, actor, log }, { changes }): Promise<void> {
    const roleIds = changes.map(({ roleId }) => roleId);
    // Locked: a concurrent save of the same roles waits, then finds them changed.
    const current = await tx
      .select({ id: roles.id, grantsAll: roles.grantsAll, permissions: roles.permissions })
      .from(roles)
      .where(inArray(roles.id, roleIds))
      .for('update');

    for (const { roleId, from, to } of changes) {
      const role = current.find((candidate) => candidate.id === roleId);
      if (!role) {
        throw new HttpError(404, 'ROLE_NOT_FOUND', 'This role does not exist');
      }
      if (role.grantsAll) {
        throw new HttpError(403, 'SYSTEM_ROLE_LOCKED', 'The system role cannot be changed');
      }
      if (rolePermissionsFrom(to).refused.length > 0) {
        throw new HttpError(400, 'INVALID_PERMISSIONS', 'A role cannot be given these');
      }
      if (!sameSet(permissionsOfRole(role), from)) {
        throw new HttpError(409, 'ROLES_CHANGED', 'Someone else changed these roles meanwhile');
      }
    }

    for (const { roleId, to } of changes) {
      await tx
        .update(roles)
        .set({ permissions: rolePermissionsFrom(to).permissions })
        .where(eq(roles.id, roleId));
    }
    log.info({ roleIds, by: actor.id }, 'Role permissions changed');
  },
});
