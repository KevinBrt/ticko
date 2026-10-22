import { describe, expect, it } from 'vitest';
import { planCategories } from './categories.ts';

const BUG = '01a1569b-9900-7000-8000-000000000001';
const REQUEST = '01a1569b-9900-7000-8000-000000000002';
const QUESTION = '01a1569b-9900-7000-8000-000000000003';

describe('planCategories', () => {
  it('keeps, adds and removes as the list says, each in its new place', () => {
    const plan = planCategories(
      [BUG, REQUEST, QUESTION],
      [
        { name: 'Incident', color: 'pink', isDefault: false },
        { id: QUESTION, name: 'Question', color: 'gray', isDefault: true },
        { id: BUG, name: 'Defect', color: 'orange', isDefault: false },
      ],
      [REQUEST],
    );

    expect(plan).toStrictEqual({
      removed: [REQUEST],
      kept: [
        { id: QUESTION, name: 'Question', color: 'gray', isDefault: true, position: 1 },
        { id: BUG, name: 'Defect', color: 'orange', isDefault: false, position: 2 },
      ],
      added: [{ name: 'Incident', color: 'pink', isDefault: false, position: 0 }],
    });
  });

  it('changes nothing when the list is the same', () => {
    expect(
      planCategories([BUG], [{ id: BUG, name: 'Bug', color: 'gray', isDefault: true }], []),
    ).toStrictEqual({
      removed: [],
      kept: [{ id: BUG, name: 'Bug', color: 'gray', isDefault: true, position: 0 }],
      added: [],
    });
  });

  it('refuses a category deleted meanwhile, rather than bring it back', () => {
    expect(
      planCategories([BUG], [{ id: REQUEST, name: 'Request', color: 'gray', isDefault: true }], []),
    ).toBeNull();
  });

  it('refuses to lose a category added meanwhile, which the list neither keeps nor removes', () => {
    expect(
      planCategories(
        [BUG, REQUEST],
        [{ id: BUG, name: 'Bug', color: 'gray', isDefault: true }],
        [],
      ),
    ).toBeNull();
  });

  it('has nothing left to delete of a category someone else removed already', () => {
    expect(
      planCategories([BUG], [{ id: BUG, name: 'Bug', color: 'gray', isDefault: true }], [REQUEST])
        ?.removed,
    ).toStrictEqual([]);
  });
});
