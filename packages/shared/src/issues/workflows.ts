import { z } from 'zod';
import { PALETTE_COLORS } from '../colors.ts';
import { WORKFLOW_MODES } from './fields.ts';
import { OPTION_PROBLEMS } from './options.ts';

/** Statuses of one workflow: enough for any way of working, few enough for its grid of moves. */
export const WORKFLOW_STATUSES_MAX = 20;

export const STATUS_NAME_MAX_LENGTH = 40;

/** Why a workflow cannot be saved, beyond a status's name: read by the server and the editor. */
export const WORKFLOW_PROBLEMS = {
  /** None or several statuses are where new issues start. */
  oneInitial: 'ONE_INITIAL',
  /** New issues would start closed. */
  initialCloses: 'INITIAL_CLOSES',
  /** A move or a removal names a status the workflow does not have, or the same one twice. */
  unknownStatus: 'UNKNOWN_STATUS',
} as const;

/** How a request names a status: its id, or `new-1`, `new-2`… for one it adds. */
export const statusRefSchema = z.union([z.uuid(), z.string().regex(/^new-\d{1,6}$/)]);

export const statusNameSchema = z.string().trim().min(1).max(STATUS_NAME_MAX_LENGTH);

/** A status as the editor saves it, in its place in the workflow. */
export const workflowStatusDraftSchema = z.object({
  ref: statusRefSchema,
  name: statusNameSchema,
  color: z.enum(PALETTE_COLORS),
  /** Issues on it are closed. */
  closes: z.boolean(),
  isInitial: z.boolean(),
});

export type WorkflowStatusDraft = z.input<typeof workflowStatusDraftSchema>;

export const transitionDraftSchema = z.object({ from: statusRefSchema, to: statusRefSchema });

/** A status taken out of the workflow, and the one its issues move to. */
export const removedStatusSchema = z.object({ statusId: z.uuid(), moveTo: statusRefSchema });

type Problem = (path: (string | number)[], message: string) => void;

/**
 * What every workflow asks: each status its own name whatever the case, exactly one where new
 * issues start (and not a closing one), and moves and removals naming statuses it has.
 */
export function checkWorkflow(
  workflow: {
    statuses: readonly WorkflowStatusDraft[];
    transitions: readonly { from: string; to: string }[];
    removed: readonly { statusId: string; moveTo: string }[];
  },
  context: z.RefinementCtx,
): void {
  const problem: Problem = (path, message) => context.addIssue({ code: 'custom', path, message });
  const refs = checkStatuses(workflow.statuses, problem);
  checkMoves(workflow.transitions, refs, problem);
  checkRemoved(workflow.removed, refs, problem);
}

/** Checks the statuses; answers how the request names them. */
function checkStatuses(statuses: readonly WorkflowStatusDraft[], problem: Problem): Set<string> {
  const names = new Set<string>();
  const refs = new Set<string>();
  for (const [index, status] of statuses.entries()) {
    if (names.has(status.name.toLowerCase())) {
      problem(['statuses', index, 'name'], OPTION_PROBLEMS.duplicateName);
    }
    names.add(status.name.toLowerCase());
    if (refs.has(status.ref)) {
      problem(['statuses', index, 'ref'], OPTION_PROBLEMS.duplicateId);
    }
    refs.add(status.ref);
    if (status.isInitial && status.closes) {
      problem(['statuses', index, 'closes'], WORKFLOW_PROBLEMS.initialCloses);
    }
  }
  if (statuses.filter(({ isInitial }) => isInitial).length !== 1) {
    problem(['statuses'], WORKFLOW_PROBLEMS.oneInitial);
  }
  return refs;
}

function checkMoves(
  transitions: readonly { from: string; to: string }[],
  refs: ReadonlySet<string>,
  problem: Problem,
): void {
  const moves = new Set<string>();
  for (const [index, { from, to }] of transitions.entries()) {
    const move = `${from} ${to}`;
    if (from === to || !refs.has(from) || !refs.has(to) || moves.has(move)) {
      problem(['transitions', index], WORKFLOW_PROBLEMS.unknownStatus);
    }
    moves.add(move);
  }
}

function checkRemoved(
  removed: readonly { statusId: string; moveTo: string }[],
  refs: ReadonlySet<string>,
  problem: Problem,
): void {
  const seen = new Set<string>();
  for (const [index, { statusId, moveTo }] of removed.entries()) {
    if (refs.has(statusId) || !refs.has(moveTo) || seen.has(statusId)) {
      problem(['removed', index], WORKFLOW_PROBLEMS.unknownStatus);
    }
    seen.add(statusId);
  }
}

/**
 * Body of `PUT /api/v1/workflow`: the whole workflow, saved at once. Its statuses in order, which
 * may follow which (kept while the mode is free, for when it is defined again), and the statuses
 * taken out, named so that one added meanwhile by someone else is never lost.
 */
export const workflowRequestSchema = z
  .object({
    mode: z.enum(WORKFLOW_MODES),
    statuses: z.array(workflowStatusDraftSchema).min(1).max(WORKFLOW_STATUSES_MAX),
    transitions: z
      .array(transitionDraftSchema)
      .max(WORKFLOW_STATUSES_MAX * (WORKFLOW_STATUSES_MAX - 1)),
    removed: z.array(removedStatusSchema).max(WORKFLOW_STATUSES_MAX),
  })
  .superRefine(checkWorkflow);

export type WorkflowRequest = z.input<typeof workflowRequestSchema>;

const workflowStatusSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.enum(PALETTE_COLORS),
  closes: z.boolean(),
  isInitial: z.boolean(),
  /** Issues on it that follow this workflow: they move when it is taken out. */
  issueCount: z.number().int(),
});

const transitionSchema = z.object({ from: z.uuid(), to: z.uuid() });

/** Body of `GET /api/v1/workflow`. */
export const workflowResponseSchema = z.object({
  mode: z.enum(WORKFLOW_MODES),
  /** In their order. */
  statuses: z.array(workflowStatusSchema),
  transitions: z.array(transitionSchema),
});

export type WorkflowResponse = z.infer<typeof workflowResponseSchema>;

export type WorkflowStatusRow = WorkflowResponse['statuses'][number];

/**
 * Body of `GET /api/v1/projects/:projectKey/workflow`: the project's own copy, or the instance's
 * workflow it follows, with the issues of the project on each status.
 */
export const projectWorkflowResponseSchema = z.object({
  /** Whether the project has a workflow of its own; else it follows the instance's. */
  customized: z.boolean(),
  mode: z.enum(WORKFLOW_MODES),
  /** In their order. */
  statuses: z.array(
    workflowStatusSchema.extend({
      /** The instance's: its name, color and closing are edited in the settings, not here. */
      shared: z.boolean(),
    }),
  ),
  transitions: z.array(transitionSchema),
  /** The instance's statuses, in order: where issues go when the project follows it again. */
  organization: z.array(workflowStatusSchema.omit({ issueCount: true })),
});

export type ProjectWorkflowResponse = z.infer<typeof projectWorkflowResponseSchema>;

/**
 * Body of `POST /api/v1/projects/:projectKey/workflow/revert`: for each status of the project's
 * copy that the instance's workflow lacks, the instance's status its issues move to.
 */
export const revertWorkflowRequestSchema = z.object({
  moves: z
    .array(z.object({ statusId: z.uuid(), moveTo: z.uuid() }))
    .max(WORKFLOW_STATUSES_MAX)
    .refine((moves) => new Set(moves.map(({ statusId }) => statusId)).size === moves.length, {
      message: 'One move per status',
    }),
});

export type RevertWorkflowRequest = z.input<typeof revertWorkflowRequestSchema>;
