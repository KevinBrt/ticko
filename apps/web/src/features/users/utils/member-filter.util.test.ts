import type { UserSummary } from '@toppo/shared';
import { describe, expect, it } from 'vitest';
import { ALL_MEMBERS, countByRole, filterMembers } from './member-filter.util.ts';

const ADMIN = { id: '01a1569b-9800-7e64-8269-eb18fddc30ee', name: 'Admin', color: 'blue' } as const;
const TEAM = { id: '01a1569b-9801-747e-91c9-d058653f2a8e', name: 'Team', color: 'green' } as const;

const member = (name: string, email: string, role: UserSummary['role']): UserSummary => ({
  id: email,
  name,
  email,
  role,
  deactivatedAt: null,
});

const MEMBERS = [
  member('Éloïse Martin', 'eloise@datapulse.example', TEAM),
  member('Kevin Brisset', 'kevin@altitude.example', ADMIN),
  member('Grace Hopper', 'grace@altitude.example', TEAM),
];

const names = (members: UserSummary[]) => members.map((one) => one.name);

describe('filterMembers', () => {
  it('shows everyone by default', () => {
    expect(filterMembers(MEMBERS, ALL_MEMBERS)).toHaveLength(3);
  });

  it('keeps one role', () => {
    expect(names(filterMembers(MEMBERS, { roleId: TEAM.id, search: '' }))).toStrictEqual([
      'Éloïse Martin',
      'Grace Hopper',
    ]);
  });

  it('searches names and emails, ignoring case and accents', () => {
    expect(names(filterMembers(MEMBERS, { roleId: null, search: ' ELOISE ' }))).toStrictEqual([
      'Éloïse Martin',
    ]);
    expect(names(filterMembers(MEMBERS, { roleId: null, search: 'altitude' }))).toStrictEqual([
      'Kevin Brisset',
      'Grace Hopper',
    ]);
  });

  it('combines the role and the search', () => {
    expect(filterMembers(MEMBERS, { roleId: ADMIN.id, search: 'grace' })).toStrictEqual([]);
  });
});

describe('countByRole', () => {
  it('counts the members of each role', () => {
    expect(countByRole(MEMBERS)).toStrictEqual(
      new Map([
        [TEAM.id, 2],
        [ADMIN.id, 1],
      ]),
    );
  });
});
