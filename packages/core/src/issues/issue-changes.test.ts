import { describe, expect, it } from 'vitest';
import { actionsFor, issueChanges } from './issue-changes.ts';

describe('issueChanges', () => {
  const current = {
    title: 'Broken link',
    description: '',
    categoryId: 'bug',
    priorityId: 'normal',
  };

  it('keeps only the fields that really change, in a stable order', () => {
    expect(
      issueChanges(current, { priorityId: 'high', title: 'Broken link', description: 'On /about' }),
    ).toStrictEqual([
      { field: 'description', from: '', to: 'On /about' },
      { field: 'priorityId', from: 'normal', to: 'high' },
    ]);
    expect(issueChanges(current, {})).toStrictEqual([]);
  });

  it('says what the changes take, each action once', () => {
    expect(
      actionsFor([
        { field: 'title', from: 'a', to: 'b' },
        { field: 'description', from: 'a', to: 'b' },
      ]),
    ).toStrictEqual(['editText']);
    expect(actionsFor([{ field: 'categoryId', from: 'a', to: 'b' }])).toStrictEqual(['editFields']);
  });
});
