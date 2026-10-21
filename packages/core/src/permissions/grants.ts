import {
  ALL_PERMISSIONS,
  type InstancePermission,
  isInstancePermission,
  isPermission,
  PERMISSIONS,
  type Permission,
  type PermissionDefinition,
} from './catalog.ts';

/** What decides the permissions a role grants. */
export interface RoleGrants {
  grantsAll: boolean;
  permissions: readonly string[];
}

/**
 * Whether `granted` includes `permission`: the one decision the server enforces and the web app
 * mirrors to hide what a user cannot do.
 */
export function can(granted: readonly string[], permission: Permission): boolean {
  return granted.includes(permission);
}

/** Whether `granted` includes at least one of `permissions`, e.g. to show a menu with several sections. */
export function canAny(granted: readonly string[], permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(granted, permission));
}

/** Whether a role may be given `permission`; the system role has them all anyway. */
export function canBeGranted(permission: Permission): boolean {
  const definition: PermissionDefinition = PERMISSIONS[permission];
  return definition.systemOnly !== true;
}

/**
 * What a role really grants, from what is stored on it. The system role grants everything;
 * otherwise a permission the catalog no longer knows (its plugin was removed), or one only the
 * system role may hold, grants nothing.
 */
export function permissionsOfRole({ grantsAll, permissions }: RoleGrants): Permission[] {
  if (grantsAll) {
    return [...ALL_PERMISSIONS];
  }
  return permissions.filter(isPermission).filter(canBeGranted);
}

/** The permissions a member's role grants in the whole instance. */
export function instancePermissionsOf(role: RoleGrants): InstancePermission[] {
  return permissionsOfRole(role).filter(isInstancePermission);
}
