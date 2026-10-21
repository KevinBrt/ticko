export const PERMISSION_SCOPES = ['instance', 'project'] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

/**
 * Every permission Toppo checks, as `resource.action`, with the level of the role that grants it.
 * Code always checks one of these, never a role name. Plugins will register theirs here too.
 */
export const PERMISSIONS = {
  'instance.settings.manage': 'instance',
  'instance.users.manage': 'instance',
  'instance.roles.manage': 'instance',
  'project.create': 'instance',
  'project.settings.manage': 'project',
  'project.members.manage': 'project',
  'issue.read': 'project',
  'issue.read.own': 'project',
  'issue.create': 'project',
  'issue.update': 'project',
  'issue.assign': 'project',
  'issue.delete': 'project',
  'comment.create': 'project',
  'comment.moderate': 'project',
} as const satisfies Record<string, PermissionScope>;

export type Permission = keyof typeof PERMISSIONS;

/** A permission granted by the instance role, everywhere in the instance. */
export type InstancePermission = {
  [P in Permission]: (typeof PERMISSIONS)[P] extends 'instance' ? P : never;
}[Permission];

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as readonly Permission[];

export function isPermission(value: string): value is Permission {
  return Object.hasOwn(PERMISSIONS, value);
}

export function isInstancePermission(value: string): value is InstancePermission {
  return isPermission(value) && PERMISSIONS[value] === 'instance';
}

export function permissionsOfScope(scope: PermissionScope): Permission[] {
  return ALL_PERMISSIONS.filter((permission) => PERMISSIONS[permission] === scope);
}
