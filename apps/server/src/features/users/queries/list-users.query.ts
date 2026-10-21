import { schema } from '@toppo/db';
import type { UsersResponse } from '@toppo/shared';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { defineQuery } from '../../../platform/cqrs/cqrs.ts';

const { roles, users } = schema;

/** Every account of the instance, deactivated ones included, by name. */
export const listUsers = defineQuery({
  name: 'user.list',
  access: { permission: 'instance.users.manage' },
  input: z.object({}),
  async handler({ db }): Promise<UsersResponse> {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: roles.id,
        roleName: roles.name,
        roleColor: roles.color,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users)
      .innerJoin(roles, eq(roles.id, users.instanceRoleId))
      .orderBy(sql`lower(${users.name})`, users.id);
    return {
      users: rows.map(({ roleId, roleName, roleColor, deactivatedAt, ...user }) => ({
        ...user,
        role: { id: roleId, name: roleName, color: roleColor },
        deactivatedAt: deactivatedAt?.toISOString() ?? null,
      })),
    };
  },
});
