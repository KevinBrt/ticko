/** The accounts of an instance and the roles they hold, as far as administration goes. */
export interface InstanceAccounts {
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
