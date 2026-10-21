import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS } from './catalog.ts';
import { can, canAny, instancePermissionsOf, permissionsOfRole } from './grants.ts';

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

describe('permissionsOfRole', () => {
  const internal = (permissions: string[]) => ({
    grantsAll: false,
    audience: 'internal' as const,
    permissions,
  });

  it('gives the system role every permission, whatever it stores', () => {
    expect(
      permissionsOfRole({ grantsAll: true, audience: 'internal', permissions: [] }),
    ).toStrictEqual([...ALL_PERMISSIONS]);
  });

  it('keeps what an internal role stores', () => {
    expect(permissionsOfRole(internal(['issue.read', 'instance.users.manage']))).toStrictEqual([
      'issue.read',
      'instance.users.manage',
    ]);
  });

  it('ignores permissions that no longer exist', () => {
    expect(permissionsOfRole(internal(['plugin.removed', 'toString', 'issue.read']))).toStrictEqual(
      ['issue.read'],
    );
  });

  it('never lets a stored value grant what only the system role has', () => {
    expect(permissionsOfRole(internal(['instance.roles.manage']))).toStrictEqual([]);
  });

  it('never lets a client role administer or moderate', () => {
    expect(
      permissionsOfRole({
        grantsAll: false,
        audience: 'client',
        permissions: ['issue.create', 'comment.moderate', 'instance.users.manage'],
      }),
    ).toStrictEqual(['issue.create']);
  });
});

describe('instancePermissionsOf', () => {
  it('keeps the permissions that apply in the whole instance', () => {
    expect(
      instancePermissionsOf({
        grantsAll: false,
        audience: 'internal',
        permissions: ['issue.read', 'project.create', 'instance.users.manage'],
      }),
    ).toStrictEqual(['project.create', 'instance.users.manage']);
  });
});
