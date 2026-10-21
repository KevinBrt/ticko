import { describe, expect, it } from 'vitest';
import { type InstanceAccounts, keepsAnAdministrator } from './administrators.ts';

const ROLES: InstanceAccounts['roles'] = [
  { id: 'administrator', grantsAll: true },
  { id: 'team', grantsAll: false },
];

function instance(...users: InstanceAccounts['users']): InstanceAccounts {
  return { users, roles: ROLES };
}

const ada = { id: 'ada', roleId: 'administrator', active: true };
const grace = { id: 'grace', roleId: 'team', active: true };

describe('keepsAnAdministrator', () => {
  it('lets a team member go', () => {
    expect(
      keepsAnAdministrator(instance(ada, grace), { type: 'deactivate', userId: 'grace' }),
    ).toBe(true);
  });

  it('refuses to deactivate the only administrator', () => {
    expect(keepsAnAdministrator(instance(ada, grace), { type: 'deactivate', userId: 'ada' })).toBe(
      false,
    );
  });

  it('lets an administrator go when another one stays active', () => {
    const alan = { id: 'alan', roleId: 'administrator', active: true };

    expect(keepsAnAdministrator(instance(ada, alan), { type: 'deactivate', userId: 'ada' })).toBe(
      true,
    );
  });

  it('does not count a deactivated administrator', () => {
    const alan = { id: 'alan', roleId: 'administrator', active: false };

    expect(keepsAnAdministrator(instance(ada, alan), { type: 'deactivate', userId: 'ada' })).toBe(
      false,
    );
  });

  it('refuses to demote the only administrator', () => {
    expect(
      keepsAnAdministrator(instance(ada, grace), {
        type: 'changeRole',
        userId: 'ada',
        roleId: 'team',
      }),
    ).toBe(false);
  });

  it('accepts promoting someone, or a change that keeps the administrator role', () => {
    expect(
      keepsAnAdministrator(instance(ada, grace), {
        type: 'changeRole',
        userId: 'grace',
        roleId: 'administrator',
      }),
    ).toBe(true);
    expect(
      keepsAnAdministrator(instance(ada), {
        type: 'changeRole',
        userId: 'ada',
        roleId: 'administrator',
      }),
    ).toBe(true);
  });
});
