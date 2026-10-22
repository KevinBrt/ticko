import { describe, expect, it } from 'vitest';
import {
  canMoveTo,
  closedAtFor,
  effectiveWorkflow,
  initialStatusOf,
  nextStatusesOf,
} from './workflow.ts';

describe('transitions', () => {
  const transitions = [
    { fromStatusId: 'new', toStatusId: 'in-progress' },
    { fromStatusId: 'new', toStatusId: 'resolved' },
    { fromStatusId: 'in-progress', toStatusId: 'resolved' },
  ];

  it('list where an issue may go from its status', () => {
    expect(nextStatusesOf(transitions, 'new')).toStrictEqual(['in-progress', 'resolved']);
    expect(nextStatusesOf(transitions, 'resolved')).toStrictEqual([]);
  });

  it('allow only the moves the workflow lists, one way', () => {
    expect(canMoveTo(transitions, 'in-progress', 'resolved')).toBe(true);
    expect(canMoveTo(transitions, 'resolved', 'in-progress')).toBe(false);
    expect(canMoveTo(transitions, 'new', 'new')).toBe(false);
  });
});

describe('effectiveWorkflow', () => {
  const instance = { id: 'instance', projectId: null };
  const copy = { id: 'copy', projectId: 'web' };

  it('takes the project’s own copy when it made one', () => {
    expect(effectiveWorkflow([instance, copy], 'web')).toBe(copy);
  });

  it('falls back on the instance’s workflow', () => {
    expect(effectiveWorkflow([instance], 'api')).toBe(instance);
    expect(effectiveWorkflow([copy, instance], 'api')).toBe(instance);
  });

  it('fails loudly when the instance has none, which the database prevents', () => {
    expect(() => effectiveWorkflow([copy], 'api')).toThrow('The instance has no workflow');
  });
});

describe('initialStatusOf', () => {
  it('finds where new issues start', () => {
    expect(
      initialStatusOf([
        { statusId: 'to-do', isInitial: false },
        { statusId: 'new', isInitial: true },
      ]),
    ).toBe('new');
  });

  it('fails loudly on a workflow without one', () => {
    expect(() => initialStatusOf([{ statusId: 'to-do', isInitial: false }])).toThrow(
      'The workflow has no initial status',
    );
  });
});

describe('closedAtFor', () => {
  const monday = new Date('2026-10-19T09:00:00Z');
  const now = new Date('2026-10-22T14:00:00Z');

  it('closes an issue when it reaches a done status', () => {
    expect(closedAtFor('done', null, now)).toBe(now);
  });

  it('keeps the first date while the issue moves between done statuses', () => {
    expect(closedAtFor('done', monday, now)).toBe(monday);
  });

  it('reopens an issue that leaves the done statuses', () => {
    expect(closedAtFor('in_progress', monday, now)).toBeNull();
    expect(closedAtFor('todo', null, now)).toBeNull();
  });
});
