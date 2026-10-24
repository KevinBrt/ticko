import { describe, expect, it } from 'vitest';
import { planOptions } from './options-plan.ts';

const A = '01a1569b-9900-7000-8000-00000000000a';
const B = '01a1569b-9900-7000-8000-00000000000b';

describe('planOptions', () => {
  it('keeps, adds and removes, each in its place, for a list without a default too', () => {
    expect(
      planOptions(
        [A, B],
        [
          { id: B, name: 'Security', color: 'pink' },
          { name: 'Mobile', color: 'blue' },
        ],
        [A],
      ),
    ).toStrictEqual({
      removed: [A],
      kept: [{ id: B, name: 'Security', color: 'pink', position: 0 }],
      added: [{ name: 'Mobile', color: 'blue', position: 1 }],
    });
  });

  it('refuses a list made before someone else changed it', () => {
    expect(planOptions([A], [{ id: B, name: 'Gone' }], [])).toBeNull();
    expect(planOptions([A, B], [{ id: A, name: 'Kept' }], [])).toBeNull();
  });
});
