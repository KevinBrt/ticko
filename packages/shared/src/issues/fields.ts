import { z } from 'zod';

/**
 * How a workflow lets issues move: only along the transitions it lists (`defined`), or from any
 * of its statuses to any other (`free`), its transitions kept for when it is defined again.
 */
export const WORKFLOW_MODES = ['defined', 'free'] as const;

export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

/** The four priority levels, lowest first: each has its own icon and color. */
export const PRIORITY_LEVELS = [1, 2, 3, 4] as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const ISSUE_TITLE_MAX_LENGTH = 200;

export const ISSUE_DESCRIPTION_MAX_LENGTH = 50_000;

/** An issue's title, as the server and the forms both check it. */
export const issueTitleSchema = z.string().trim().min(1).max(ISSUE_TITLE_MAX_LENGTH);

/** Markdown, kept as typed: leading spaces can matter (code blocks). */
export const issueDescriptionSchema = z.string().max(ISSUE_DESCRIPTION_MAX_LENGTH);
