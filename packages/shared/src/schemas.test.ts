import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './api-error.ts';
import { healthResponseSchema } from './health.ts';

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
