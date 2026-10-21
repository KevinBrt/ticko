import { describe, expect, it } from 'vitest';
import { can, canAny, instancePermissionsOf } from './grants.ts';

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

describe('instancePermissionsOf', () => {
  it('keeps the instance permissions an instance role stores', () => {
    expect(instancePermissionsOf(['instance.users.manage', 'project.create'])).toStrictEqual([
      'instance.users.manage',
      'project.create',
    ]);
  });

  it('never lets an instance role grant a project permission', () => {
    expect(instancePermissionsOf(['issue.delete', 'instance.roles.manage'])).toStrictEqual([
      'instance.roles.manage',
    ]);
  });

  it('ignores permissions that no longer exist', () => {
    expect(instancePermissionsOf(['plugin.removed', 'toString', 'project.create'])).toStrictEqual([
      'project.create',
    ]);
  });
});
