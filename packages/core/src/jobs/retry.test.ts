import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { retryDelay } from './retry.ts';

const MINUTE = 60_000;

describe('retryDelay', () => {
  it('waits longer after each failure, from 30 seconds up to 6 hours', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((attempts) => retryDelay(attempts, 0.5))).toStrictEqual([
      30_000,
      2 * MINUTE,
      8 * MINUTE,
      32 * MINUTE,
      128 * MINUTE,
      360 * MINUTE,
      360 * MINUTE,
    ]);
  });

  it('spreads retries by a fifth at most, never below zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (attempts, random) => {
          const middle = retryDelay(attempts, 0.5);
          const delay = retryDelay(attempts, random);
          expect(delay).toBeGreaterThanOrEqual(Math.floor(middle * 0.8));
          expect(delay).toBeLessThanOrEqual(Math.ceil(middle * 1.2));
        },
      ),
    );
  });
});
