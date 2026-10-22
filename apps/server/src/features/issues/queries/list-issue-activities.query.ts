import { commentActionsOf } from '@toppo/core';
import { type Db, schema } from '@toppo/db';
import {
  type CommentAction,
  ISSUE_ACTIVITIES_PAGE_SIZE,
  ISSUE_ACTIVITY_PAYLOADS,
  type IssueActivitiesResponse,
  type IssueActivity,
  issueActivitiesQuerySchema,
  issueKeyParamsSchema,
  type UserRef,
} from '@toppo/shared';
import { and, asc, count, desc, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm';
import { defineQuery } from '../../../platform/cqrs/cqrs.ts';
import { userRefOf } from '../utils/issue-rows.util.ts';

const { activities, comments, users } = schema;

/** The activities an issue's history shows: every type listed, so that none is forgotten. */
const SHOWN: Readonly<Record<keyof typeof ISSUE_ACTIVITY_PAYLOADS, boolean>> = {
  'issue.created': true,
  'issue.titleChanged': true,
  'issue.descriptionChanged': true,
  'issue.categoryChanged': true,
  'issue.priorityChanged': true,
  'issue.statusChanged': true,
  'issue.assigneeChanged': true,
  'issue.commented': true,
  'issue.commentEdited': false,
  'issue.commentDeleted': false,
  'issue.deleted': false,
};

const HISTORY_TYPES = Object.entries(SHOWN)
  .filter(([, shown]) => shown)
  .map(([type]) => type);

interface ActivityRow {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  actor: { id: string; name: string; deletedAt: Date | null };
  comment: { id: string; body: string; editedAt: Date | null; authorId: string } | null;
}

/**
 * One page of an issue's history, newest first, each change checked against its type. A comment
 * shows as it is now, with what the caller may do on it; a deleted one is left out.
 */
export const listIssueActivities = defineQuery({
  name: 'issue.listActivities',
  access: { project: 'issueKey' },
  input: issueKeyParamsSchema.extend(issueActivitiesQuerySchema.shape),
  async handler({ db, actor, project }, { page }): Promise<IssueActivitiesResponse> {
    const ofIssue = and(
      eq(activities.issueId, project.issue.id),
      inArray(activities.type, HISTORY_TYPES),
      or(ne(activities.type, 'issue.commented'), isNotNull(comments.id)),
    );
    // The comment an activity is about, if any: its id is all the activity keeps.
    const about = eq(comments.id, sql`(${activities.payload} ->> 'commentId')::uuid`);
    const rows = await db
      .select({
        id: activities.id,
        type: activities.type,
        payload: activities.payload,
        createdAt: activities.createdAt,
        actor: { id: users.id, name: users.name, deletedAt: users.deletedAt },
        comment: {
          id: comments.id,
          body: comments.body,
          editedAt: comments.editedAt,
          authorId: comments.authorId,
        },
      })
      .from(activities)
      .innerJoin(users, eq(users.id, activities.actorId))
      .leftJoin(comments, about)
      .where(ofIssue)
      // Changes made in one request share its time: they keep the order they were made in.
      .orderBy(desc(activities.createdAt), asc(activities.id))
      .limit(ISSUE_ACTIVITIES_PAGE_SIZE)
      .offset((page - 1) * ISSUE_ACTIVITIES_PAGE_SIZE);
    const [total] = await db
      .select({ count: count() })
      .from(activities)
      .leftJoin(comments, about)
      .where(ofIssue);
    const people = await peopleNamedIn(db, rows);
    // Read-only while archived: nothing to offer.
    const actionsOn = (authorId: string) =>
      project.archived ? [] : commentActionsOf(project.permissions, authorId === actor.id);

    return {
      rows: rows.map((row) => toActivity(row, people, actionsOn)),
      matching: total?.count ?? 0,
      page,
      pageSize: ISSUE_ACTIVITIES_PAGE_SIZE,
    };
  },
});

/** The people assignment changes name, by id, in one query: named as they are now. */
async function peopleNamedIn(db: Db, rows: readonly ActivityRow[]): Promise<Map<string, UserRef>> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.type === 'issue.assigneeChanged') {
      const { from, to } = ISSUE_ACTIVITY_PAYLOADS['issue.assigneeChanged'].parse(row.payload);
      for (const id of [from, to]) {
        if (id) {
          ids.add(id);
        }
      }
    }
  }
  if (ids.size === 0) {
    return new Map();
  }
  const named = await db
    .select({ id: users.id, name: users.name, deletedAt: users.deletedAt })
    .from(users)
    .where(inArray(users.id, [...ids]));
  return new Map(named.map((user) => [user.id, userRefOf(user)]));
}

/** A stored activity as the history shows it. */
function toActivity(
  row: ActivityRow,
  people: ReadonlyMap<string, UserRef>,
  actionsOn: (authorId: string) => CommentAction[],
): IssueActivity {
  const base = { id: row.id, actor: userRefOf(row.actor), createdAt: row.createdAt.toISOString() };
  const { payload } = row;
  const payloads = ISSUE_ACTIVITY_PAYLOADS;
  const person = (id: string | null) => (id ? (people.get(id) ?? { id, name: null }) : null);

  switch (row.type) {
    case 'issue.created':
      return { ...base, type: 'issue.created', payload: payloads['issue.created'].parse(payload) };
    case 'issue.titleChanged':
      return {
        ...base,
        type: 'issue.titleChanged',
        payload: payloads['issue.titleChanged'].parse(payload),
      };
    case 'issue.descriptionChanged':
      return {
        ...base,
        type: 'issue.descriptionChanged',
        payload: payloads['issue.descriptionChanged'].parse(payload),
      };
    case 'issue.categoryChanged':
      return {
        ...base,
        type: 'issue.categoryChanged',
        payload: payloads['issue.categoryChanged'].parse(payload),
      };
    case 'issue.priorityChanged':
      return {
        ...base,
        type: 'issue.priorityChanged',
        payload: payloads['issue.priorityChanged'].parse(payload),
      };
    case 'issue.statusChanged':
      return {
        ...base,
        type: 'issue.statusChanged',
        payload: payloads['issue.statusChanged'].parse(payload),
      };
    case 'issue.assigneeChanged': {
      const { from, to } = payloads['issue.assigneeChanged'].parse(payload);
      return {
        ...base,
        type: 'issue.assigneeChanged',
        payload: { from: person(from), to: person(to) },
      };
    }
    case 'issue.commented': {
      if (!row.comment) {
        throw new Error(`The comment of activity ${row.id} is gone`);
      }
      const { id, body, editedAt, authorId } = row.comment;
      return {
        ...base,
        type: 'issue.commented',
        payload: {
          comment: {
            id,
            body,
            editedAt: editedAt?.toISOString() ?? null,
            actions: actionsOn(authorId),
          },
        },
      };
    }
    default:
      throw new Error(`An activity of an unknown type: ${row.type}`);
  }
}
