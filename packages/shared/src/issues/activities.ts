import { z } from 'zod';
import { PRIORITY_LEVELS } from './fields.ts';
import { userRefSchema } from './issues.ts';

/** A status or a category as it was named when the change happened. */
const namedSchema = z.object({ id: z.uuid(), name: z.string() });

const prioritySchema = namedSchema.extend({
  level: z.union(PRIORITY_LEVELS.map((level) => z.literal(level))),
});

/**
 * What each kind of activity stores, by type: the record history, notifications, webhooks and
 * plugins read. Names of statuses, categories and priorities are kept as they were; people are
 * kept by id only, so that erasing an account erases its name from history too.
 */
export const ISSUE_ACTIVITY_PAYLOADS = {
  'issue.created': z.object({}),
  'issue.titleChanged': z.object({ from: z.string(), to: z.string() }),
  'issue.descriptionChanged': z.object({ from: z.string(), to: z.string() }),
  'issue.categoryChanged': z.object({ from: namedSchema, to: namedSchema }),
  'issue.priorityChanged': z.object({ from: prioritySchema, to: prioritySchema }),
  'issue.statusChanged': z.object({ from: namedSchema, to: namedSchema }),
  'issue.assigneeChanged': z.object({ from: z.uuid().nullable(), to: z.uuid().nullable() }),
  /** Recorded without an issue, which is gone: its key says which it was. */
  'issue.deleted': z.object({ key: z.string() }),
} as const;

export type IssueActivityType = keyof typeof ISSUE_ACTIVITY_PAYLOADS;

export type IssueActivityPayload<T extends IssueActivityType> = z.infer<
  (typeof ISSUE_ACTIVITY_PAYLOADS)[T]
>;

/** One change in an issue's history, as `GET /api/v1/issues/:issueKey/activities` shows it. */
const entry = <T extends Exclude<IssueActivityType, 'issue.deleted'>, P extends z.ZodType>(
  type: T,
  payload: P,
) =>
  z.object({
    id: z.uuid(),
    type: z.literal(type),
    actor: userRefSchema,
    /** UTC ISO 8601. */
    createdAt: z.iso.datetime(),
    payload,
  });

export const issueActivitySchema = z.discriminatedUnion('type', [
  entry('issue.created', ISSUE_ACTIVITY_PAYLOADS['issue.created']),
  entry('issue.titleChanged', ISSUE_ACTIVITY_PAYLOADS['issue.titleChanged']),
  entry('issue.descriptionChanged', ISSUE_ACTIVITY_PAYLOADS['issue.descriptionChanged']),
  entry('issue.categoryChanged', ISSUE_ACTIVITY_PAYLOADS['issue.categoryChanged']),
  entry('issue.priorityChanged', ISSUE_ACTIVITY_PAYLOADS['issue.priorityChanged']),
  entry('issue.statusChanged', ISSUE_ACTIVITY_PAYLOADS['issue.statusChanged']),
  // People are named when read: a deleted account shows as such.
  entry(
    'issue.assigneeChanged',
    z.object({ from: userRefSchema.nullable(), to: userRefSchema.nullable() }),
  ),
]);

export type IssueActivity = z.infer<typeof issueActivitySchema>;

export const issueActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const issueActivitiesResponseSchema = z.object({
  /** One page, newest first. */
  rows: z.array(issueActivitySchema),
  matching: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type IssueActivitiesResponse = z.infer<typeof issueActivitiesResponseSchema>;
