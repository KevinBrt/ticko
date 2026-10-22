import { describe, expect, it } from 'vitest';
import {
  canMoveTo,
  closedAtFor,
  effectiveWorkflow,
  initialStatusOf,
  nextStatusesOf,
} from './workflow.ts';

describe('moves', () => {
  const defined = {
    mode: 'defined',
    statusIds: ['new', 'in-progress', 'resolved'],
    transitions: [
      { fromStatusId: 'new', toStatusId: 'in-progress' },
      { fromStatusId: 'new', toStatusId: 'resolved' },
      { fromStatusId: 'in-progress', toStatusId: 'resolved' },
    ],
  } as const;
  const free = { ...defined, mode: 'free' } as const;

  it('list where an issue may go from its status', () => {
    expect(nextStatusesOf(defined, 'new')).toStrictEqual(['in-progress', 'resolved']);
    expect(nextStatusesOf(defined, 'resolved')).toStrictEqual([]);
  });

  it('allow only the moves the workflow lists, one way', () => {
    expect(canMoveTo(defined, 'in-progress', 'resolved')).toBe(true);
    expect(canMoveTo(defined, 'resolved', 'in-progress')).toBe(false);
    expect(canMoveTo(defined, 'new', 'new')).toBe(false);
  });

  it('allow any other status of a free workflow, whatever its transitions', () => {
    expect(nextStatusesOf(free, 'resolved')).toStrictEqual(['new', 'in-progress']);
    expect(canMoveTo(free, 'resolved', 'new')).toBe(true);
    expect(canMoveTo(free, 'new', 'new')).toBe(false);
    expect(nextStatusesOf(free, 'elsewhere')).toStrictEqual([]);
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

  it('closes an issue when it reaches a closing status', () => {
    expect(closedAtFor(true, null, now)).toBe(now);
  });

  it('keeps the first date while the issue moves between closing statuses', () => {
    expect(closedAtFor(true, monday, now)).toBe(monday);
  });

  it('reopens an issue that leaves the closing statuses', () => {
    expect(closedAtFor(false, monday, now)).toBeNull();
    expect(closedAtFor(false, null, now)).toBeNull();
  });
});
