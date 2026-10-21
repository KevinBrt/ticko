import { SUPPORTED_LOCALES } from '@toppo/shared';
import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  isPermission,
  PERMISSIONS,
  type Permission,
  permissionsOfScope,
} from './catalog.ts';
import { DEFAULT_ROLE_IDS, DEFAULT_ROLE_NAMES, DEFAULT_ROLES } from './default-roles.ts';

describe('permission catalog', () => {
  it('names every permission resource.action', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission).toMatch(/^[a-z]+(\.[a-z]+)+$/);
    }
  });

  it('recognizes catalog entries only', () => {
    expect(isPermission('issue.update')).toBe(true);
    expect(isPermission('issue.fly')).toBe(false);
    expect(isPermission('toString')).toBe(false);
  });

  it('splits permissions between instance and project roles', () => {
    expect(permissionsOfScope('instance')).toStrictEqual([
      'instance.settings.manage',
      'instance.users.manage',
      'instance.roles.manage',
      'project.create',
    ]);
    expect(
      [...permissionsOfScope('instance'), ...permissionsOfScope('project')].sort(),
    ).toStrictEqual([...ALL_PERMISSIONS].sort());
  });
});

describe('default roles', () => {
  it('only grant permissions of their own scope', () => {
    for (const role of DEFAULT_ROLES) {
      for (const permission of role.permissions) {
        expect(PERMISSIONS[permission], `${role.scope} ${role.name}: ${permission}`).toBe(
          role.scope,
        );
      }
    }
  });

  it('have unique ids and unique names per scope', () => {
    expect(new Set(DEFAULT_ROLES.map((role) => role.id)).size).toBe(DEFAULT_ROLES.length);
    expect(new Set(DEFAULT_ROLES.map((role) => `${role.scope}:${role.name}`)).size).toBe(
      DEFAULT_ROLES.length,
    );
    expect(Object.values(DEFAULT_ROLE_IDS).sort()).toStrictEqual(
      DEFAULT_ROLES.map((role) => role.id).sort(),
    );
  });

  it('are named in every supported language, distinctly', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const names = Object.values(DEFAULT_ROLE_NAMES[locale]);
      expect(
        names.every((name) => name.trim() !== ''),
        locale,
      ).toBe(true);
      expect(new Set(names.map((name) => name.toLowerCase())).size, locale).toBe(names.length);
    }
    expect(DEFAULT_ROLES.map((role) => role.name)).toStrictEqual(
      DEFAULT_ROLES.map((role) => DEFAULT_ROLE_NAMES.en[role.kind]),
    );
  });

  // The matrix of ARCHITECTURE.md, written out so that any change to it is deliberate.
  const MATRIX: Record<Permission, [administrator: boolean, team: boolean, requester: boolean]> = {
    'instance.settings.manage': [true, false, false],
    'instance.users.manage': [true, false, false],
    'instance.roles.manage': [true, false, false],
    'project.create': [true, true, false],
    'project.settings.manage': [true, false, false],
    'project.members.manage': [true, false, false],
    'issue.read': [true, true, false],
    'issue.read.own': [true, true, true],
    'issue.create': [true, true, true],
    'issue.update': [true, true, false],
    'issue.assign': [true, true, false],
    'issue.delete': [true, false, false],
    'comment.create': [true, true, true],
    'comment.moderate': [true, false, false],
  };

  it.each(ALL_PERMISSIONS)('grant %s as documented', (permission) => {
    const scope = PERMISSIONS[permission];
    const granted = (['administrator', 'team', 'requester'] as const).map((kind) =>
      DEFAULT_ROLES.find(
        (role) => role.scope === scope && role.kind === kind,
      )?.permissions.includes(permission),
    );
    expect(granted).toStrictEqual(MATRIX[permission]);
  });
});
