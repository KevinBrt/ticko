import { describe, expect, it } from 'vitest';
import { pluralForm } from './plural.util.ts';

describe('pluralForm', () => {
  it('follows each language’s rules', () => {
    expect([0, 1, 2].map((count) => pluralForm('en', count))).toStrictEqual([
      'other',
      'one',
      'other',
    ]);
    expect([0, 1, 2].map((count) => pluralForm('fr', count))).toStrictEqual([
      'one',
      'one',
      'other',
    ]);
  });
});
