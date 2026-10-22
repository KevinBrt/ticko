import { describe, expect, it } from 'vitest';
import { priorityLevelOf } from './priority-level.ts';

describe('priorityLevelOf', () => {
  it.each([1, 2, 3, 4])('knows level %i', (level) => {
    expect(priorityLevelOf(level)).toBe(level);
  });

  it.each([0, 5, 2.5])('refuses %d', (level) => {
    expect(() => priorityLevelOf(level)).toThrow(`Unknown priority level ${level}`);
  });
});
