import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS } from './catalog.ts';
import {
  can,
  canAny,
  instancePermissionsOf,
  permissionsOfRole,
  rolePermissionsFrom,
} from './grants.ts';

describe('can', () => {
  it('allows exactly the granted permissions', () => {
    const granted = ['instance.users.manage', 'project.create'];

    expect(can(granted, 'instance.users.manage')).toBe(true);
    expect(can(granted, 'instance.roles.manage')).toBe(false);
    expect(can([], 'project.create')).toBe(false);
  });
});

describe('canAny', () => {
  it('allows when at least one permission is granted', () => {
    const granted = ['instance.roles.manage'];

    expect(canAny(granted, ['instance.users.manage', 'instance.roles.manage'])).toBe(true);
    expect(canAny(granted, ['instance.users.manage', 'instance.settings.manage'])).toBe(false);
    expect(canAny(granted, [])).toBe(false);
  });
});

const role = (permissions: string[]) => ({ grantsAll: false, permissions });

describe('permissionsOfRole', () => {
  it('gives the system role every permission, whatever it stores', () => {
    expect(permissionsOfRole({ grantsAll: true, permissions: [] })).toStrictEqual([
      ...ALL_PERMISSIONS,
    ]);
  });

  it('keeps what a role stores', () => {
    expect(permissionsOfRole(role(['issue.read', 'instance.users.manage']))).toStrictEqual([
      'issue.read',
      'instance.users.manage',
    ]);
  });

  it('ignores permissions that no longer exist', () => {
    expect(permissionsOfRole(role(['plugin.removed', 'toString', 'issue.read']))).toStrictEqual([
      'issue.read',
    ]);
  });

  it('never lets a stored value grant what only the system role has', () => {
    expect(permissionsOfRole(role(['instance.roles.manage']))).toStrictEqual([]);
  });
});

describe('rolePermissionsFrom', () => {
  it('keeps each grantable permission once, in catalog order', () => {
    expect(
      rolePermissionsFrom(['comment.create', 'issue.read', 'comment.create', 'project.create']),
    ).toStrictEqual({
      permissions: ['issue.read', 'comment.create', 'project.create'],
      refused: [],
    });
  });

  it('refuses unknown permissions and those only the system role holds', () => {
    expect(
      rolePermissionsFrom(['issue.read', 'issue.fly', 'instance.roles.manage', 'issue.fly']),
    ).toStrictEqual({
      permissions: ['issue.read'],
      refused: ['issue.fly', 'instance.roles.manage'],
    });
  });
});

describe('instancePermissionsOf', () => {
  it('keeps the permissions that apply in the whole instance, in catalog order', () => {
    expect(
      instancePermissionsOf(role(['issue.read', 'project.create', 'instance.users.manage'])),
    ).toStrictEqual(['instance.users.manage', 'project.create']);
  });
});
