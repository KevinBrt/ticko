import { describe, expect, it } from 'vitest';
import { labelsChange } from './labels.ts';

describe('labelsChange', () => {
  it('tells the labels given and those taken, in their order', () => {
    expect(
      labelsChange(['mobile', 'billing'], ['billing', 'security', 'regression']),
    ).toStrictEqual({ added: ['security', 'regression'], removed: ['mobile'] });
  });

  it('finds no change when the labels stay the same, whatever their order', () => {
    expect(labelsChange(['mobile', 'billing'], ['billing', 'mobile'])).toBeNull();
    expect(labelsChange([], [])).toBeNull();
  });
});
