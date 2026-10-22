import { describe, expect, it } from 'vitest';
import { projectColorFor } from './project-color.ts';

describe('projectColorFor', () => {
  it('gives projects colors in turn, never gray', () => {
    const colors = Array.from({ length: 7 }, (_, count) => projectColorFor(count));

    expect(new Set(colors).size).toBe(7);
    expect(colors).not.toContain('gray');
  });

  it('starts again once every color is taken', () => {
    expect(projectColorFor(7)).toBe(projectColorFor(0));
    expect(projectColorFor(15)).toBe(projectColorFor(1));
  });

  it('copes with a count that is not a whole positive number', () => {
    expect(projectColorFor(-3)).toBe(projectColorFor(0));
    expect(projectColorFor(2.7)).toBe(projectColorFor(2));
  });
});
