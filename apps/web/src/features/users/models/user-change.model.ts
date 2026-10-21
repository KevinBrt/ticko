import type { AssignableRolesResponse, UserSummary } from '@toppo/shared';

/** What an administrator does to an account from the users screen. */
export type UserChange =
  | { type: 'changeRole'; userId: string; roleId: string }
  | { type: 'deactivate'; userId: string }
  | { type: 'reactivate'; userId: string };

/** The list as it will be once the server accepts `change`: shown at once, rolled back if not. */
export function applyUserChange(
  users: readonly UserSummary[],
  change: UserChange,
  roles: AssignableRolesResponse['roles'],
  now: Date,
): UserSummary[] {
  return users.map((user) =>
    user.id === change.userId ? changed(user, change, roles, now) : user,
  );
}

function changed(
  user: UserSummary,
  change: UserChange,
  roles: AssignableRolesResponse['roles'],
  now: Date,
): UserSummary {
  switch (change.type) {
    case 'changeRole':
      return { ...user, role: roles.find((role) => role.id === change.roleId) ?? user.role };
    case 'deactivate':
      return { ...user, deactivatedAt: now.toISOString() };
    case 'reactivate':
      return { ...user, deactivatedAt: null };
  }
}
