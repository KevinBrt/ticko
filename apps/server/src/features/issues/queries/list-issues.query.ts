import { issueVisibilityOf } from '@toppo/core';
import { schema } from '@toppo/db';
import {
  ISSUES_PAGE_SIZE,
  type IssuesResponse,
  issuesQuerySchema,
  projectIssuesParamsSchema,
} from '@toppo/shared';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { defineQuery } from '../../../platform/cqrs/cqrs.ts';
import { toIssueSummary } from '../utils/issue-rows.util.ts';

const { issueCategories, issues, priorities, statuses, users } = schema;
const assignees = alias(users, 'assignees');
const reporters = alias(users, 'reporters');

/**
 * One page of a project's issues, newest first: every one, or only those the caller reported
 * when that is all they may see, filtered in the query.
 */
export const listIssues = defineQuery({
  name: 'issue.list',
  access: { project: 'projectKey' },
  input: projectIssuesParamsSchema.extend(issuesQuerySchema.shape),
  async handler({ db, actor, project }, { page }): Promise<IssuesResponse> {
    const visibility = issueVisibilityOf(project.permissions);
    const visible = and(
      eq(issues.projectId, project.id),
      visibility === 'own' ? eq(issues.reporterId, actor.id) : undefined,
      visibility === 'none' ? sql`false` : undefined,
    );
    const rows = await db
      .select({
        number: issues.number,
        title: issues.title,
        status: {
          id: statuses.id,
          name: statuses.name,
          color: statuses.color,
          category: statuses.category,
        },
        category: {
          id: issueCategories.id,
          name: issueCategories.name,
          color: issueCategories.color,
        },
        priority: { id: priorities.id, name: priorities.name, level: priorities.level },
        assignee: { id: assignees.id, name: assignees.name, deletedAt: assignees.deletedAt },
        reporter: { id: reporters.id, name: reporters.name, deletedAt: reporters.deletedAt },
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .innerJoin(statuses, eq(statuses.id, issues.statusId))
      .innerJoin(issueCategories, eq(issueCategories.id, issues.categoryId))
      .innerJoin(priorities, eq(priorities.id, issues.priorityId))
      .innerJoin(reporters, eq(reporters.id, issues.reporterId))
      .leftJoin(assignees, eq(assignees.id, issues.assigneeId))
      .where(visible)
      .orderBy(desc(issues.number))
      .limit(ISSUES_PAGE_SIZE)
      .offset((page - 1) * ISSUES_PAGE_SIZE);
    const [total] = await db.select({ count: count() }).from(issues).where(visible);

    return {
      rows: rows.map((row) => toIssueSummary(project.key, row)),
      matching: total?.count ?? 0,
      page,
      pageSize: ISSUES_PAGE_SIZE,
    };
  },
});
