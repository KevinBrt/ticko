import { type InstancePermission, isInstancePermission, type Permission } from './catalog.ts';

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

/**
 * What an instance role really grants, from the permissions stored on it. Anything else is
 * dropped: a project permission saved on an instance role, or one whose plugin was removed,
 * never grants anything.
 */
export function instancePermissionsOf(stored: readonly string[]): InstancePermission[] {
  return stored.filter(isInstancePermission);
}
