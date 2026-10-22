import { describe, expect, it } from 'vitest';
import { closingChanges, planWorkflow } from './workflow-plan.ts';

const NEW = '01a1569b-9900-7000-8000-000000000001';
const WAITING = '01a1569b-9900-7000-8000-000000000002';
const DONE = '01a1569b-9900-7000-8000-000000000003';

const status = (ref: string, name: string, closes = false, isInitial = false) => ({
  ref,
  name,
  color: 'gray' as const,
  closes,
  isInitial,
});

describe('planWorkflow', () => {
  it('keeps, adds and takes out as the request says, each in its new place', () => {
    const plan = planWorkflow([NEW, WAITING, DONE], {
      statuses: [status(NEW, 'New', false, true), status('new-1', 'Review'), status(DONE, 'Done')],
      removed: [{ statusId: WAITING, moveTo: 'new-1' }],
    });

    expect(plan).toStrictEqual({
      kept: [
        { id: NEW, name: 'New', color: 'gray', closes: false, isInitial: true, position: 0 },
        { id: DONE, name: 'Done', color: 'gray', closes: false, isInitial: false, position: 2 },
      ],
      added: [
        {
          ref: 'new-1',
          name: 'Review',
          color: 'gray',
          closes: false,
          isInitial: false,
          position: 1,
        },
      ],
      removed: [{ statusId: WAITING, moveTo: 'new-1' }],
    });
  });

  it('refuses a status taken out meanwhile, rather than bring it back', () => {
    expect(
      planWorkflow([NEW], {
        statuses: [status(NEW, 'New'), status(WAITING, 'Waiting')],
        removed: [],
      }),
    ).toBeNull();
  });

  it('refuses to lose a status added meanwhile, which it neither keeps nor takes out', () => {
    expect(
      planWorkflow([NEW, WAITING], { statuses: [status(NEW, 'New')], removed: [] }),
    ).toBeNull();
  });

  it('has nothing left to move from a status someone else took out already', () => {
    expect(
      planWorkflow([NEW], {
        statuses: [status(NEW, 'New')],
        removed: [{ statusId: WAITING, moveTo: NEW }],
      })?.removed,
    ).toStrictEqual([]);
  });
});

describe('closingChanges', () => {
  it('finds the statuses that start or stop closing issues', () => {
    const before = [
      { id: NEW, closes: false },
      { id: WAITING, closes: false },
      { id: DONE, closes: true },
    ] as const;
    const kept = [
      { id: NEW, name: 'New', color: 'gray', closes: false, isInitial: true, position: 0 },
      {
        id: WAITING,
        name: 'Waiting',
        color: 'gray',
        closes: true,
        isInitial: false,
        position: 1,
      },
      {
        id: DONE,
        name: 'Done',
        color: 'gray',
        closes: false,
        isInitial: false,
        position: 2,
      },
    ] as const;

    expect(closingChanges(before, [...kept])).toStrictEqual({
      closing: [WAITING],
      reopening: [DONE],
    });
  });
});
