import { effectiveWorkflow, nextStatusesOf } from '@toppo/core';
import { schema } from '@toppo/db';
import { type IssueFieldsResponse, projectIssuesParamsSchema } from '@toppo/shared';
import { asc, eq, isNull, or } from 'drizzle-orm';
import { defineQuery } from '../../../platform/cqrs/cqrs.ts';
import { priorityLevelOf } from '../utils/issue-rows.util.ts';

const { issueCategories, priorities, statuses, workflowStatuses, workflowTransitions, workflows } =
  schema;

/**
 * The short lists issue forms offer in a project: the statuses of its workflow and the moves
 * between them, the categories and the priorities. Bounded lists, loaded whole.
 */
export const getIssueFields = defineQuery({
  name: 'issue.fields',
  access: { project: 'projectKey' },
  input: projectIssuesParamsSchema,
  async handler({ db, project }): Promise<IssueFieldsResponse> {
    const candidates = await db
      .select({ id: workflows.id, projectId: workflows.projectId })
      .from(workflows)
      .where(or(isNull(workflows.projectId), eq(workflows.projectId, project.id)));
    const workflow = effectiveWorkflow(candidates, project.id);
    const [steps, transitions, categories, levels] = await Promise.all([
      db
        .select({
          id: statuses.id,
          name: statuses.name,
          color: statuses.color,
          category: statuses.category,
          isInitial: workflowStatuses.isInitial,
        })
        .from(workflowStatuses)
        .innerJoin(statuses, eq(statuses.id, workflowStatuses.statusId))
        .where(eq(workflowStatuses.workflowId, workflow.id))
        .orderBy(asc(workflowStatuses.position)),
      db
        .select({
          fromStatusId: workflowTransitions.fromStatusId,
          toStatusId: workflowTransitions.toStatusId,
        })
        .from(workflowTransitions)
        .where(eq(workflowTransitions.workflowId, workflow.id)),
      db
        .select({
          id: issueCategories.id,
          name: issueCategories.name,
          color: issueCategories.color,
          isDefault: issueCategories.isDefault,
        })
        .from(issueCategories)
        .orderBy(asc(issueCategories.position)),
      db
        .select({
          id: priorities.id,
          name: priorities.name,
          level: priorities.level,
          isDefault: priorities.isDefault,
        })
        .from(priorities)
        .orderBy(asc(priorities.level)),
    ]);

    return {
      statuses: steps.map((step) => ({ ...step, next: nextStatusesOf(transitions, step.id) })),
      categories,
      priorities: levels.map((priority) => ({
        ...priority,
        level: priorityLevelOf(priority.level),
      })),
    };
  },
});
