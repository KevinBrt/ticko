import { describe, expect, it } from 'vitest';
import { OPTION_PROBLEMS } from './options.ts';
import { WORKFLOW_PROBLEMS, type WorkflowRequest, workflowRequestSchema } from './workflows.ts';

const NEW = '01a1569b-9900-7000-8000-000000000001';
const DONE = '01a1569b-9900-7000-8000-000000000002';
const GONE = '01a1569b-9900-7000-8000-000000000003';

const status = (
  ref: string,
  name: string,
  fields: Partial<WorkflowRequest['statuses'][number]> = {},
) => ({ ref, name, color: 'gray', closes: false, isInitial: false, ...fields }) as const;

/** A workflow from New to Done, plus a status the request adds. */
function workflow(changes: Partial<WorkflowRequest> = {}): WorkflowRequest {
  return {
    mode: 'defined',
    statuses: [
      status(NEW, 'New', { isInitial: true }),
      status('new-1', 'Review'),
      status(DONE, 'Done', { closes: true }),
    ],
    transitions: [
      { from: NEW, to: 'new-1' },
      { from: 'new-1', to: DONE },
    ],
    removed: [{ statusId: GONE, moveTo: 'new-1' }],
    ...changes,
  };
}

/** The problems a request has, each at its place. */
function problems(request: WorkflowRequest) {
  const result = workflowRequestSchema.safeParse(request);
  return result.success ? [] : result.error.issues.map(({ path, message }) => [path, message]);
}

describe('workflowRequestSchema', () => {
  it('takes the statuses by id or by the key of a new one, moves and removals between them', () => {
    expect(problems(workflow())).toStrictEqual([]);
    expect(problems(workflow({ mode: 'free', transitions: [] }))).toStrictEqual([]);
  });

  it('says which name another status already has, whatever the case', () => {
    const statuses = workflow().statuses.map((s) =>
      s.ref === DONE ? { ...s, name: 'review' } : s,
    );

    expect(problems(workflow({ statuses }))).toStrictEqual([
      [['statuses', 2, 'name'], OPTION_PROBLEMS.duplicateName],
    ]);
  });

  it('asks for exactly one initial status, which does not close issues', () => {
    const statuses = workflow().statuses;

    expect(
      problems(workflow({ statuses: statuses.map((s) => ({ ...s, isInitial: false })) })),
    ).toStrictEqual([[['statuses'], WORKFLOW_PROBLEMS.oneInitial]]);
    expect(
      problems(
        workflow({
          statuses: statuses.map((s) => ({ ...s, isInitial: s.ref === DONE })),
          transitions: [],
        }),
      ),
    ).toStrictEqual([[['statuses', 2, 'closes'], WORKFLOW_PROBLEMS.initialCloses]]);
  });

  it('refuses a move to itself, to a status it lacks, or listed twice', () => {
    expect(
      problems(
        workflow({
          transitions: [
            { from: NEW, to: NEW },
            { from: NEW, to: GONE },
            { from: NEW, to: DONE },
            { from: NEW, to: DONE },
          ],
        }),
      ),
    ).toStrictEqual([
      [['transitions', 0], WORKFLOW_PROBLEMS.unknownStatus],
      [['transitions', 1], WORKFLOW_PROBLEMS.unknownStatus],
      [['transitions', 3], WORKFLOW_PROBLEMS.unknownStatus],
    ]);
  });

  it('refuses to remove a status it keeps, or to move issues to one it lacks', () => {
    expect(
      problems(
        workflow({
          removed: [
            { statusId: NEW, moveTo: DONE },
            { statusId: GONE, moveTo: 'new-9' },
          ],
        }),
      ),
    ).toStrictEqual([
      [['removed', 0], WORKFLOW_PROBLEMS.unknownStatus],
      [['removed', 1], WORKFLOW_PROBLEMS.unknownStatus],
    ]);
  });

  it('names a new status only by a key of its own', () => {
    expect(
      workflowRequestSchema.safeParse(
        workflow({
          statuses: [status('mine', 'Mine', { isInitial: true })],
          transitions: [],
          removed: [],
        }),
      ).success,
    ).toBe(false);
  });
});
