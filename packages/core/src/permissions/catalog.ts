/** Where a permission applies: in the whole instance, or inside the projects a member reaches. */
export const PERMISSION_SCOPES = ['instance', 'project'] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

/** Groups of the roles and permissions matrix, in display order. */
export const PERMISSION_SECTIONS = ['tickets', 'conversation', 'project', 'organisation'] as const;

export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];

/**
 * Which roles may be given a permission:
 * - `anyone`: client roles too;
 * - `internal`: internal roles only, never a client role;
 * - `system`: no role but the system one, which grants everything.
 */
export type PermissionGrantee = 'anyone' | 'internal' | 'system';

interface PermissionDefinition {
  scope: PermissionScope;
  section: PermissionSection;
  grantedTo: PermissionGrantee;
}

/**
 * Every permission Toppo checks, as `resource.action`, in display order. Code always checks one
 * of these, never a role name. Plugins will register theirs here too.
 */
export const PERMISSIONS = {
  'issue.read': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'issue.read.own': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'issue.create': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'issue.update': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'issue.assign': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'issue.delete': { scope: 'project', section: 'tickets', grantedTo: 'anyone' },
  'comment.create': { scope: 'project', section: 'conversation', grantedTo: 'anyone' },
  'comment.moderate': { scope: 'project', section: 'conversation', grantedTo: 'internal' },
  'project.settings.manage': { scope: 'project', section: 'project', grantedTo: 'internal' },
  'project.members.manage': { scope: 'project', section: 'project', grantedTo: 'internal' },
  'instance.users.manage': { scope: 'instance', section: 'organisation', grantedTo: 'internal' },
  'project.create': { scope: 'instance', section: 'organisation', grantedTo: 'internal' },
  'instance.settings.manage': { scope: 'instance', section: 'organisation', grantedTo: 'internal' },
  'instance.roles.manage': {
    scope: 'instance',
    section: 'organisation',
    grantedTo: 'system',
  },
} as const satisfies Record<string, PermissionDefinition>;

export type Permission = keyof typeof PERMISSIONS;

/** A permission that applies in the whole instance, granted by the member's role. */
export type InstancePermission = {
  [P in Permission]: (typeof PERMISSIONS)[P]['scope'] extends 'instance' ? P : never;
}[Permission];

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as readonly Permission[];

export function isPermission(value: string): value is Permission {
  return Object.hasOwn(PERMISSIONS, value);
}

export function isInstancePermission(value: string): value is InstancePermission {
  return isPermission(value) && PERMISSIONS[value].scope === 'instance';
}
