import { formatIssueKey, priorityLevelOf } from '@toppo/core';
import { schema } from '@toppo/db';
import { type IssueSummary, type LabelRef, projectKeySchema, type UserRef } from '@toppo/shared';
import { sql } from 'drizzle-orm';

const { issueLabels, issues, labels } = schema;

/**
 * The labels of the issue a row is about, by name, as a column of the query itself: read from
 * the index of `issue_labels`, a page of issues at once.
 */
export const labelsOfIssue = sql<LabelRef[]>`coalesce((
  select json_agg(
    json_build_object('id', ${labels.id}, 'name', ${labels.name}, 'color', ${labels.color})
    order by lower(${labels.name}), ${labels.id}
  )
  from ${issueLabels} join ${labels} on ${labels.id} = ${issueLabels.labelId}
  where ${issueLabels.issueId} = ${issues.id}
), '[]'::json)`;

/** Someone as an issue names them: an erased account keeps its id, not its name. */
export function userRefOf(user: { id: string; name: string; deletedAt: Date | null }): UserRef {
  return { id: user.id, name: user.deletedAt ? null : user.name };
}

/** The columns of an issue row the list and the page share, before they are sent. */
export interface IssueSummaryRow {
  number: number;
  title: string;
  status: IssueSummary['status'];
  category: IssueSummary['category'];
  priority: { id: string; name: string; level: number };
  assignee: { id: string; name: string; deletedAt: Date | null } | null;
  reporter: { id: string; name: string; deletedAt: Date | null };
  labels: LabelRef[];
  createdAt: Date;
  updatedAt: Date;
}

/** An issue as lists show it, known by its key. */
export function toIssueSummary(projectKey: string, row: IssueSummaryRow): IssueSummary {
  return {
    key: formatIssueKey({ projectKey: projectKeySchema.parse(projectKey), number: row.number }),
    title: row.title,
    status: row.status,
    category: row.category,
    priority: { ...row.priority, level: priorityLevelOf(row.priority.level) },
    assignee: row.assignee ? userRefOf(row.assignee) : null,
    reporter: userRefOf(row.reporter),
    labels: row.labels,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
