import { can } from './grants.ts';

/**
 * Whether an actor may give `role` to someone, or act on a member who holds it. Only holders of
 * the system role, the only ones who manage roles, touch the system role: nobody can make
 * themselves an administrator by managing members.
 */
export function canActOnRole(
  actorPermissions: readonly string[],
  role: { grantsAll: boolean },
): boolean {
  return !role.grantsAll || can(actorPermissions, 'instance.roles.manage');
}

/** The accounts that matter to administration, and the roles they hold. */
export interface InstanceAccounts {
  /** At least the active administrators and the member a change is about; others never count. */
  users: readonly { id: string; roleId: string; active: boolean }[];
  /** Holding a role that grants every permission makes an administrator. */
  roles: readonly { id: string; grantsAll: boolean }[];
}

export type AccountChange =
  | { type: 'deactivate'; userId: string }
  | { type: 'changeRole'; userId: string; roleId: string };

/** Whether the instance still has an active administrator once `change` is made. */
export function keepsAnAdministrator(accounts: InstanceAccounts, change: AccountChange): boolean {
  const administratorRoles = new Set(
    accounts.roles.filter((role) => role.grantsAll).map((role) => role.id),
  );
  return accounts.users
    .map((user) => applyChange(user, change))
    .some((user) => user.active && administratorRoles.has(user.roleId));
}

function applyChange(
  user: InstanceAccounts['users'][number],
  change: AccountChange,
): InstanceAccounts['users'][number] {
  if (user.id !== change.userId) {
    return user;
  }
  switch (change.type) {
    case 'deactivate':
      return { ...user, active: false };
    case 'changeRole':
      return { ...user, roleId: change.roleId };
  }
}
