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
 * What a role really grants, from what is stored on it, in catalog order. The system role grants
 * everything; otherwise a permission the catalog no longer knows (its plugin was removed), or one
 * only the system role may hold, grants nothing.
 */
export function permissionsOfRole({ grantsAll, permissions }: RoleGrants): Permission[] {
  return grantsAll ? [...ALL_PERMISSIONS] : rolePermissionsFrom(permissions).permissions;
}

/**
 * What a role may store out of `requested`: the permissions it may be given, once each, in
 * catalog order. `refused` lists the rest (unknown, or held by the system role only), for the
 * caller to report rather than drop silently.
 */
export function rolePermissionsFrom(requested: readonly string[]): {
  permissions: Permission[];
  refused: string[];
} {
  const grantable = (value: string) => isPermission(value) && canBeGranted(value);
  return {
    permissions: ALL_PERMISSIONS.filter(
      (permission) => canBeGranted(permission) && requested.includes(permission),
    ),
    refused: [...new Set(requested.filter((value) => !grantable(value)))],
  };
}

/** The permissions a member's role grants in the whole instance. */
export function instancePermissionsOf(role: RoleGrants): InstancePermission[] {
  return permissionsOfRole(role).filter(isInstancePermission);
}
