import { formatIssueKey, priorityLevelOf } from '@toppo/core';
import { type IssueSummary, projectKeySchema, type UserRef } from '@toppo/shared';

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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
