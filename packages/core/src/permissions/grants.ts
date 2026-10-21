import type { RoleAudience } from '@toppo/shared';
import {
  ALL_PERMISSIONS,
  type InstancePermission,
  isInstancePermission,
  isPermission,
  PERMISSIONS,
  type Permission,
  type PermissionGrantee,
} from './catalog.ts';

/** What each kind of role may be given; the system role has everything anyway. */
const GRANTABLE_TO: Readonly<Record<RoleAudience, readonly PermissionGrantee[]>> = {
  internal: ['anyone', 'internal'],
  client: ['anyone'],
};

/** What decides the permissions a role grants. */
export interface RoleGrants {
  grantsAll: boolean;
  audience: RoleAudience;
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

/** Whether a role for `audience` may be given `permission`; the system role has them all anyway. */
export function canBeGranted(permission: Permission, audience: RoleAudience): boolean {
  return GRANTABLE_TO[audience].includes(PERMISSIONS[permission].grantedTo);
}

/**
 * What a role really grants, from what is stored on it. The system role grants everything;
 * otherwise a permission the catalog no longer knows (its plugin was removed), or one this kind
 * of role may not be given (internal ones on a client role), grants nothing.
 */
export function permissionsOfRole({ grantsAll, audience, permissions }: RoleGrants): Permission[] {
  if (grantsAll) {
    return [...ALL_PERMISSIONS];
  }
  return permissions
    .filter(isPermission)
    .filter((permission) => canBeGranted(permission, audience));
}

/** The permissions a member's role grants in the whole instance. */
export function instancePermissionsOf(role: RoleGrants): InstancePermission[] {
  return permissionsOfRole(role).filter(isInstancePermission);
}
