import { describe, expect, it } from 'vitest';
import { uuidv7 } from './uuid.ts';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  it('produces RFC 9562 version 7 identifiers', () => {
    for (let i = 0; i < 100; i++) {
      expect(uuidv7()).toMatch(UUID_V7);
    }
  });

  it('encodes the timestamp in the first 48 bits', () => {
    const now = Date.parse('2026-10-20T08:00:00.123Z');
    const id = uuidv7(now);

    expect(Number.parseInt(id.replace(/-/g, '').slice(0, 12), 16)).toBe(now);
  });

  it('sorts by creation time', () => {
    const ids = [1_000, 2_000, 3_000_000, Date.now()].map((time) => uuidv7(time));

    expect([...ids].sort()).toStrictEqual(ids);
  });

  it('does not repeat', () => {
    const now = Date.now();
    const ids = new Set(Array.from({ length: 10_000 }, () => uuidv7(now)));

    expect(ids.size).toBe(10_000);
  });
});
