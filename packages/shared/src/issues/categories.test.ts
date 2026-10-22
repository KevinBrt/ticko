import { describe, expect, it } from 'vitest';
import { CATEGORIES_MAX, categoriesRequestSchema } from './categories.ts';
import { OPTION_PROBLEMS } from './options.ts';
import { prioritiesRequestSchema } from './priorities.ts';

const ID = '01a1569b-9900-7000-8000-000000000001';
const OTHER = '01a1569b-9900-7000-8000-000000000002';

const category = (name: string, isDefault = false, id?: string) => ({
  ...(id ? { id } : {}),
  name,
  color: 'gray',
  isDefault,
});

/** A request saving `categories` and removing `removed`. */
const list = (categories: object[], removed: string[] = []) => ({ categories, removed });

/** The problems a request has, each at its place. */
function problems(result: ReturnType<typeof categoriesRequestSchema.safeParse>) {
  return result.success ? [] : result.error.issues.map(({ path, message }) => [path, message]);
}

describe('categoriesRequestSchema', () => {
  it('takes the whole list, existing categories by id, new ones without, names trimmed', () => {
    expect(
      categoriesRequestSchema.parse(
        list(
          [category(' Bug ', false, ID), { ...category('Incident', true), color: 'pink' }],
          [OTHER],
        ),
      ),
    ).toStrictEqual({
      categories: [
        { id: ID, name: 'Bug', color: 'gray', isDefault: false },
        { name: 'Incident', color: 'pink', isDefault: true },
      ],
      removed: [OTHER],
    });
  });

  it('says which name another category already has, whatever the case', () => {
    const result = categoriesRequestSchema.safeParse(
      list([category('Bug', true), category('Request'), category('BUG ')]),
    );

    expect(problems(result)).toStrictEqual([
      [['categories', 2, 'name'], OPTION_PROBLEMS.duplicateName],
    ]);
  });

  it('asks for exactly one default', () => {
    const none = categoriesRequestSchema.safeParse(list([category('Bug')]));
    const two = categoriesRequestSchema.safeParse(
      list([category('Bug', true), category('Request', true)]),
    );

    expect(problems(none)).toStrictEqual([[['categories'], OPTION_PROBLEMS.oneDefault]]);
    expect(problems(two)).toStrictEqual([[['categories'], OPTION_PROBLEMS.oneDefault]]);
  });

  it('refuses a category twice, kept and removed, a color out of the palette, and too many', () => {
    const twice = categoriesRequestSchema.safeParse(
      list([category('Bug', true, ID), category('Request', false, ID)]),
    );
    const both = categoriesRequestSchema.safeParse(list([category('Bug', true, ID)], [ID]));
    const color = categoriesRequestSchema.safeParse(
      list([{ ...category('Bug', true), color: '#ff0000' }]),
    );
    const many = categoriesRequestSchema.safeParse(
      list(
        Array.from({ length: CATEGORIES_MAX + 1 }, (_, index) =>
          category(`Category ${index}`, index === 0),
        ),
      ),
    );

    expect(problems(twice)).toStrictEqual([[['categories', 1, 'id'], OPTION_PROBLEMS.duplicateId]]);
    expect(problems(both)).toStrictEqual([[['removed'], 'A category is kept and removed']]);
    expect(color.success).toBe(false);
    expect(many.success).toBe(false);
  });
});

describe('prioritiesRequestSchema', () => {
  const levels = (names: string[], defaultIndex = 1) =>
    names.map((name, index) => ({
      id: `01a1569b-9900-7000-8000-00000000000${index}`,
      name,
      isDefault: index === defaultIndex,
    }));

  it('renames the four levels at once, one of them the default', () => {
    expect(
      prioritiesRequestSchema.safeParse({ priorities: levels(['Low', 'Normal', 'High', 'Urgent']) })
        .success,
    ).toBe(true);
  });

  it('refuses another number of levels, a blank or shared name', () => {
    expect(
      prioritiesRequestSchema.safeParse({ priorities: levels(['Low', 'Normal', 'High']) }).success,
    ).toBe(false);
    expect(
      prioritiesRequestSchema.safeParse({ priorities: levels(['Low', ' ', 'High', 'Urgent']) })
        .success,
    ).toBe(false);
    expect(
      prioritiesRequestSchema.safeParse({ priorities: levels(['Low', 'high', 'High', 'Urgent']) })
        .success,
    ).toBe(false);
  });
});
