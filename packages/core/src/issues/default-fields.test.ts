import { PRIORITY_LEVELS, SUPPORTED_LOCALES } from '@toppo/shared';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_FIELD_NAMES,
  DEFAULT_PRIORITIES,
  DEFAULT_STATUSES,
} from './default-fields.ts';

const distinct = (values: readonly string[]) => new Set(values).size === values.length;

describe('default fields', () => {
  it('give every row its own id', () => {
    const ids = [
      ...DEFAULT_STATUSES.flatMap(({ id, workflowStatusId }) => [id, workflowStatusId]),
      ...DEFAULT_PRIORITIES.map(({ id }) => id),
      ...DEFAULT_CATEGORIES.map(({ id }) => id),
    ];

    expect(distinct(ids)).toBe(true);
  });

  it('start issues on a single status, and let them reach a done one', () => {
    expect(DEFAULT_STATUSES.filter(({ initial }) => initial).map(({ kind }) => kind)).toStrictEqual(
      ['new'],
    );
    expect(DEFAULT_STATUSES.map(({ category }) => category)).toContain('done');
  });

  it('have the four priority levels in order, one of them the default', () => {
    expect(DEFAULT_PRIORITIES.map(({ level }) => level)).toStrictEqual([...PRIORITY_LEVELS]);
    expect(DEFAULT_PRIORITIES.filter(({ isDefault }) => isDefault)).toHaveLength(1);
  });

  it('have a single default category', () => {
    expect(DEFAULT_CATEGORIES.filter(({ isDefault }) => isDefault)).toHaveLength(1);
  });

  it('are named in every supported language, distinctly', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { statuses, priorities, categories } = DEFAULT_FIELD_NAMES[locale];
      for (const names of [statuses, priorities, categories]) {
        const values = Object.values(names).map((name) => name.trim().toLowerCase());
        expect(
          values.every((name) => name !== ''),
          locale,
        ).toBe(true);
        expect(distinct(values), locale).toBe(true);
      }
    }
  });

  it('are seeded with their English names', () => {
    const { statuses, priorities, categories } = DEFAULT_FIELD_NAMES.en;

    expect(DEFAULT_STATUSES.map(({ name }) => name)).toStrictEqual(
      DEFAULT_STATUSES.map(({ kind }) => statuses[kind]),
    );
    expect(DEFAULT_PRIORITIES.map(({ name }) => name)).toStrictEqual(
      DEFAULT_PRIORITIES.map(({ kind }) => priorities[kind]),
    );
    expect(DEFAULT_CATEGORIES.map(({ name }) => name)).toStrictEqual(
      DEFAULT_CATEGORIES.map(({ kind }) => categories[kind]),
    );
  });
});
