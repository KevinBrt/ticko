import { canMoveTo, closedAtFor, effectiveWorkflow } from '@toppo/core';
import { schema } from '@toppo/db';
import { changeIssueStatusRequestSchema, issueKeyParamsSchema } from '@toppo/shared';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { defineCommand, type Transaction } from '../../../platform/cqrs/cqrs.ts';
import { HttpError } from '../../../platform/http/http-error.ts';
import { activity } from '../utils/activities.util.ts';

const { activities, issues, statuses, workflowTransitions, workflows } = schema;

/**
 * Moves an issue to another status, one its project's workflow allows from the current one, for
 * everyone, administrators included. Closing and reopening are moves like the others: the issue
 * is closed while its status is a done one.
 */
export const changeIssueStatus = defineCommand({
  name: 'issue.changeStatus',
  access: { project: 'issueKey', permission: 'issue.update' },
  input: issueKeyParamsSchema.extend(changeIssueStatusRequestSchema.shape),
  async handler({ tx, actor, project, log }, { statusId }): Promise<void> {
    // Locked: two moves of the same issue are checked one after the other.
    const [current] = await tx
      .select({ statusId: issues.statusId, closedAt: issues.closedAt })
      .from(issues)
      .where(eq(issues.id, project.issue.id))
      .for('update');
    if (!current) {
      throw new HttpError(404, 'ISSUE_NOT_FOUND', 'This issue does not exist');
    }
    if (current.statusId === statusId) {
      return;
    }
    const transitions = await transitionsFrom(tx, project.id, current.statusId);
    if (!canMoveTo(transitions, current.statusId, statusId)) {
      throw new HttpError(
        409,
        'STATUS_NOT_ALLOWED',
        'The workflow does not allow this status from the current one',
      );
    }
    const named = await tx
      .select({ id: statuses.id, name: statuses.name, category: statuses.category })
      .from(statuses)
      .where(inArray(statuses.id, [current.statusId, statusId]));
    const from = named.find(({ id }) => id === current.statusId);
    const to = named.find(({ id }) => id === statusId);
    if (!(from && to)) {
      throw new Error('A status of the workflow is missing');
    }

    await tx
      .update(issues)
      .set({ statusId, closedAt: closedAtFor(to.category, current.closedAt, new Date()) })
      .where(eq(issues.id, project.issue.id));
    await tx.insert(activities).values({
      projectId: project.id,
      issueId: project.issue.id,
      actorId: actor.id,
      ...activity('issue.statusChanged', {
        from: { id: from.id, name: from.name },
        to: { id: to.id, name: to.name },
      }),
    });
    log.info({ issueId: project.issue.id, statusId, by: actor.id }, 'Issue status changed');
  },
});

/** The moves the project's workflow allows from `statusId`. */
async function transitionsFrom(tx: Transaction, projectId: string, statusId: string) {
  const candidates = await tx
    .select({ id: workflows.id, projectId: workflows.projectId })
    .from(workflows)
    .where(or(isNull(workflows.projectId), eq(workflows.projectId, projectId)));
  const workflow = effectiveWorkflow(candidates, projectId);
  return await tx
    .select({
      fromStatusId: workflowTransitions.fromStatusId,
      toStatusId: workflowTransitions.toStatusId,
    })
    .from(workflowTransitions)
    .where(
      and(
        eq(workflowTransitions.workflowId, workflow.id),
        eq(workflowTransitions.fromStatusId, statusId),
      ),
    );
}
