import { z } from 'zod';
import { ROLE_COLORS } from './roles.ts';

/** A role as user management shows it: a colored badge. */
const roleBadgeSchema = z.object({ id: z.uuid(), name: z.string(), color: z.enum(ROLE_COLORS) });

export const userIdParamsSchema = z.object({
  userId: z.uuid(),
});

export const userSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  /** The member's own role. */
  role: roleBadgeSchema,
  /** UTC ISO 8601 date of deactivation, or `null` while the account is active. */
  deactivatedAt: z.iso.datetime().nullable(),
});

export type UserSummary = z.infer<typeof userSummarySchema>;

/** Body of `GET /api/v1/users`: every account, active or not, by name. */
export const usersResponseSchema = z.object({
  users: z.array(userSummarySchema),
});

export type UsersResponse = z.infer<typeof usersResponseSchema>;

/** Body of `GET /api/v1/users/roles`: the roles users can be given, in creation order. */
export const assignableRolesResponseSchema = z.object({
  roles: z.array(roleBadgeSchema),
});

export type AssignableRolesResponse = z.infer<typeof assignableRolesResponseSchema>;

/** Body of `PATCH /api/v1/users/:userId`: the member's new role. */
export const changeUserRoleRequestSchema = z.object({
  roleId: z.uuid(),
});

export type ChangeUserRoleRequest = z.infer<typeof changeUserRoleRequestSchema>;
