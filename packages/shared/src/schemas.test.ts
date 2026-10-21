import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './api-error.ts';
import { healthResponseSchema } from './health.ts';
import { invitationTokenSchema } from './members/invitations.ts';
import {
  ROLE_NAME_MAX_LENGTH,
  rolePermissionsRequestSchema,
  roleRequestSchema,
} from './members/roles.ts';
import { userSummarySchema } from './members/users.ts';

describe('userSummarySchema', () => {
  const ada = {
    id: '01a1569b-9900-7000-8000-000000000001',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: { id: '01a1569b-9800-7e64-8269-eb18fddc30ee', name: 'Administrator', color: 'blue' },
    deactivatedAt: null,
  };

  it('strips what a list of users must never carry', () => {
    expect(
      userSummarySchema.parse({ ...ada, password: 'scrypt:hash', sessions: [] }),
    ).toStrictEqual(ada);
  });

  it('dates a deactivation in UTC ISO 8601 only', () => {
    expect(
      userSummarySchema.parse({ ...ada, deactivatedAt: '2026-10-21T08:30:00.000Z' }),
    ).toBeTruthy();
    expect(userSummarySchema.safeParse({ ...ada, deactivatedAt: '21/10/2026' }).success).toBe(
      false,
    );
  });
});

describe('healthResponseSchema', () => {
  it('accepts a healthy and an unhealthy report', () => {
    expect(healthResponseSchema.parse({ status: 'ok', checks: { database: 'ok' } })).toBeTruthy();
    expect(
      healthResponseSchema.parse({ status: 'error', checks: { database: 'error' } }),
    ).toBeTruthy();
  });

  it('strips unknown fields so internals never leak through the response', () => {
    const parsed = healthResponseSchema.parse({
      status: 'ok',
      checks: { database: 'ok', version: '1.2.3' },
      hostname: 'db-internal',
    });
    expect(parsed).toStrictEqual({ status: 'ok', checks: { database: 'ok' } });
  });
});

describe('apiErrorSchema', () => {
  it('accepts an error with and without details', () => {
    expect(
      apiErrorSchema.parse({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
    ).toBeTruthy();
    expect(
      apiErrorSchema.parse({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid request',
          details: [{ path: 'body.title', message: 'Required' }],
        },
      }),
    ).toBeTruthy();
  });

  it('rejects an error without a code', () => {
    expect(apiErrorSchema.safeParse({ error: { message: 'Oops' } }).success).toBe(false);
  });
});

describe('invitationTokenSchema', () => {
  it('accepts 32 random bytes in base64url only', () => {
    expect(invitationTokenSchema.safeParse('a'.repeat(43)).success).toBe(true);
    expect(invitationTokenSchema.safeParse(`${'a'.repeat(42)}_`).success).toBe(true);
    expect(invitationTokenSchema.safeParse('a'.repeat(42)).success).toBe(false);
    expect(invitationTokenSchema.safeParse(`${'a'.repeat(42)}=`).success).toBe(false);
    expect(invitationTokenSchema.safeParse(`${'a'.repeat(42)}/`).success).toBe(false);
  });
});

describe('roleRequestSchema', () => {
  it('trims the name and refuses a blank or long one', () => {
    expect(roleRequestSchema.parse({ name: '  Supervisor ', color: 'violet' })).toStrictEqual({
      name: 'Supervisor',
      color: 'violet',
    });
    expect(roleRequestSchema.safeParse({ name: '   ', color: 'violet' }).success).toBe(false);
    expect(
      roleRequestSchema.safeParse({ name: 'x'.repeat(ROLE_NAME_MAX_LENGTH + 1), color: 'gray' })
        .success,
    ).toBe(false);
    expect(roleRequestSchema.safeParse({ name: 'Supervisor', color: '#f00' }).success).toBe(false);
  });
});

describe('rolePermissionsRequestSchema', () => {
  const change = (roleId: string) => ({ roleId, from: [], to: ['issue.read'] });

  it('takes each role at most once', () => {
    const team = '01a1569b-9801-747e-91c9-d058653f2a8e';
    const requester = '01a1569b-9802-7f0a-b82f-656d1e2109c6';

    expect(
      rolePermissionsRequestSchema.safeParse({ changes: [change(team), change(requester)] })
        .success,
    ).toBe(true);
    expect(
      rolePermissionsRequestSchema.safeParse({ changes: [change(team), change(team)] }).success,
    ).toBe(false);
    expect(rolePermissionsRequestSchema.safeParse({ changes: [] }).success).toBe(false);
  });
});
