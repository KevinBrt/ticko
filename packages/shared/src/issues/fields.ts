import { z } from 'zod';

/** What a status means: still to do, under way, or done, which closes the issue. */
export const STATUS_CATEGORIES = ['todo', 'in_progress', 'done'] as const;

export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

/** The four priority levels, lowest first: each has its own icon and color. */
export const PRIORITY_LEVELS = [1, 2, 3, 4] as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const ISSUE_TITLE_MAX_LENGTH = 200;

export const ISSUE_DESCRIPTION_MAX_LENGTH = 50_000;

/** An issue's title, as the server and the forms both check it. */
export const issueTitleSchema = z.string().trim().min(1).max(ISSUE_TITLE_MAX_LENGTH);

/** Markdown, kept as typed: leading spaces can matter (code blocks). */
export const issueDescriptionSchema = z.string().max(ISSUE_DESCRIPTION_MAX_LENGTH);
