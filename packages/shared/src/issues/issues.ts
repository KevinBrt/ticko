import { z } from 'zod';
import { PALETTE_COLORS } from '../colors.ts';
import { projectKeySchema } from '../project-key.ts';
import {
  issueDescriptionSchema,
  issueTitleSchema,
  PRIORITY_LEVELS,
  STATUS_CATEGORIES,
} from './fields.ts';

/** Rows per page of a project's issues. */
export const ISSUES_PAGE_SIZE = 50;

/** Changes per page of an issue's history. */
export const ISSUE_ACTIVITIES_PAGE_SIZE = 50;

/** `WEB-42`: a project key and a number, up to 9 digits so that it fits a database integer. */
export const issueKeySchema = z.string().regex(/^[A-Z][A-Z0-9]{1,9}-[1-9]\d{0,8}$/);

export const issueKeyParamsSchema = z.object({ issueKey: issueKeySchema });

export const projectIssuesParamsSchema = z.object({ projectKey: projectKeySchema });

/** Someone an issue names: `name` is `null` once their account is deleted. */
export const userRefSchema = z.object({ id: z.uuid(), name: z.string().nullable() });

export type UserRef = z.infer<typeof userRefSchema>;

export const issueStatusSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.enum(PALETTE_COLORS),
  category: z.enum(STATUS_CATEGORIES),
});

export const issueCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.enum(PALETTE_COLORS),
});

export const issuePrioritySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  level: z.union(PRIORITY_LEVELS.map((level) => z.literal(level))),
});

/** What someone may do on an issue (`issueActionsOf` in `@toppo/core`); the server stays the judge. */
export const ISSUE_ACTIONS = [
  'editText',
  'editFields',
  'changeStatus',
  'assign',
  'delete',
] as const;

export type IssueAction = (typeof ISSUE_ACTIONS)[number];

/** Body of `POST /api/v1/projects/:projectKey/issues`: what is not given takes its default. */
export const createIssueRequestSchema = z.object({
  title: issueTitleSchema,
  description: issueDescriptionSchema.default(''),
  categoryId: z.uuid().optional(),
  priorityId: z.uuid().optional(),
  /** Needs `issue.assign`. */
  assigneeId: z.uuid().optional(),
});

export type CreateIssueRequest = z.input<typeof createIssueRequestSchema>;

export const createIssueResponseSchema = z.object({ id: z.uuid(), key: z.string() });

/** The fields of an issue changed in place, as opposed to its status and assignee. */
export const updateIssueFieldsSchema = z.object({
  title: issueTitleSchema,
  description: issueDescriptionSchema,
  categoryId: z.uuid(),
  priorityId: z.uuid(),
});

/** Body of `PATCH /api/v1/issues/:issueKey`: only the fields given change. */
export const updateIssueRequestSchema = updateIssueFieldsSchema
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, { message: 'Nothing to change' });

export type UpdateIssueRequest = z.input<typeof updateIssueRequestSchema>;

/** Body of `PUT /api/v1/issues/:issueKey/status`: one of the statuses the workflow allows next. */
export const changeIssueStatusRequestSchema = z.object({ statusId: z.uuid() });

/** Body of `PUT /api/v1/issues/:issueKey/assignee`: someone who reaches the project, or nobody. */
export const assignIssueRequestSchema = z.object({ assigneeId: z.uuid().nullable() });

/** Query of `GET /api/v1/projects/:projectKey/issues` and `GET /api/v1/issues/assigned`. */
export const issuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export interface IssuesQuery {
  page?: number | undefined;
}

export const issueSummarySchema = z.object({
  key: z.string(),
  title: z.string(),
  status: issueStatusSchema,
  category: issueCategorySchema,
  priority: issuePrioritySchema,
  assignee: userRefSchema.nullable(),
  reporter: userRefSchema,
  /** UTC ISO 8601. */
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type IssueSummary = z.infer<typeof issueSummarySchema>;

export const issuesResponseSchema = z.object({
  /** One page, newest first. */
  rows: z.array(issueSummarySchema),
  matching: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type IssuesResponse = z.infer<typeof issuesResponseSchema>;

/** An issue assigned to the caller, with the project it belongs to. */
export const assignedIssueSchema = issueSummarySchema.extend({
  project: z.object({ key: z.string(), name: z.string(), color: z.enum(PALETTE_COLORS) }),
});

export type AssignedIssue = z.infer<typeof assignedIssueSchema>;

/** Body of `GET /api/v1/issues/assigned`: the caller's issues, open or closed, in every project. */
export const assignedIssuesResponseSchema = z.object({
  /** One page, the most urgent first, then the newest. */
  rows: z.array(assignedIssueSchema),
  matching: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type AssignedIssuesResponse = z.infer<typeof assignedIssuesResponseSchema>;

/** Body of `GET /api/v1/issues/:issueKey`. */
export const issueResponseSchema = issueSummarySchema.extend({
  id: z.uuid(),
  project: z.object({ key: z.string(), name: z.string() }),
  /** Markdown. */
  description: z.string(),
  /** UTC ISO 8601 date the issue was closed, or `null` while it is open. */
  closedAt: z.iso.datetime().nullable(),
  /** What the caller may do on it, to hide the rest. */
  actions: z.array(z.enum(ISSUE_ACTIONS)),
});

export type IssueResponse = z.infer<typeof issueResponseSchema>;

/**
 * Body of `GET /api/v1/projects/:projectKey/issue-fields`: the short lists the forms offer. Each
 * status says which may follow it in the project's workflow.
 */
export const issueFieldsResponseSchema = z.object({
  /** In the workflow's order. */
  statuses: z.array(issueStatusSchema.extend({ isInitial: z.boolean(), next: z.array(z.uuid()) })),
  categories: z.array(issueCategorySchema.extend({ isDefault: z.boolean() })),
  /** Lowest first. */
  priorities: z.array(issuePrioritySchema.extend({ isDefault: z.boolean() })),
});

export type IssueFieldsResponse = z.infer<typeof issueFieldsResponseSchema>;

/** People an issue can be assigned to: active members who reach its project. */
export const assigneesResponseSchema = z.object({
  people: z.array(z.object({ id: z.uuid(), name: z.string(), email: z.string() })),
});

export type AssigneesResponse = z.infer<typeof assigneesResponseSchema>;
