import { z } from 'zod';

/** Colors of role badges, from the design tokens' status palette. */
export const ROLE_COLORS = ['gray', 'blue', 'green', 'amber', 'violet', 'cyan'] as const;

export type RoleColor = (typeof ROLE_COLORS)[number];

/** A role as member management shows it: a colored badge. */
export const roleBadgeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.enum(ROLE_COLORS),
});

export type RoleBadge = z.infer<typeof roleBadgeSchema>;

/** At most this many roles: the matrix shows them side by side, and lists stay bounded. */
export const ROLES_MAX = 20;

export const ROLE_NAME_MAX_LENGTH = 40;

export const roleIdParamsSchema = z.object({
  roleId: z.uuid(),
});

/** A role as the roles and permissions matrix shows it. */
export const roleDetailsSchema = roleBadgeSchema.extend({
  /** The system role: every permission, now and to come; it cannot be changed or deleted. */
  grantsAll: z.boolean(),
  /** What the role grants, in catalog order: every permission for the system role. */
  permissions: z.array(z.string()),
  /** Members holding it, deactivated ones included. */
  memberCount: z.number().int().nonnegative(),
  /** Pending invitations giving it, expired ones included. */
  invitationCount: z.number().int().nonnegative(),
});

export type RoleDetails = z.infer<typeof roleDetailsSchema>;

/** Body of `GET /api/v1/roles`: every role, in creation order. */
export const rolesResponseSchema = z.object({
  roles: z.array(roleDetailsSchema),
});

export type RolesResponse = z.infer<typeof rolesResponseSchema>;

/** Body of `POST /api/v1/roles` and `PATCH /api/v1/roles/:roleId`. */
export const roleRequestSchema = z.object({
  name: z.string().trim().min(1).max(ROLE_NAME_MAX_LENGTH),
  color: z.enum(ROLE_COLORS),
});

export type RoleRequest = z.infer<typeof roleRequestSchema>;

export const createRoleResponseSchema = z.object({
  id: z.uuid(),
});

const permissionListSchema = z.array(z.string().max(100)).max(100);

/** Body of `PUT /api/v1/roles/permissions`: the roles the matrix changed, saved together. */
export const rolePermissionsRequestSchema = z.object({
  changes: z
    .array(
      z.object({
        roleId: z.uuid(),
        /** What the matrix showed: if the role changed since, nothing is saved. */
        from: permissionListSchema,
        to: permissionListSchema,
      }),
    )
    .min(1)
    .max(ROLES_MAX)
    .refine((changes) => new Set(changes.map(({ roleId }) => roleId)).size === changes.length, {
      message: 'Each role at most once',
    }),
});

export type RolePermissionsRequest = z.infer<typeof rolePermissionsRequestSchema>;
