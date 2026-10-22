import {
  assigneesResponseSchema,
  assignIssueRequestSchema,
  changeIssueStatusRequestSchema,
  createIssueRequestSchema,
  createIssueResponseSchema,
  issueActivitiesQuerySchema,
  issueActivitiesResponseSchema,
  issueFieldsResponseSchema,
  issueKeyParamsSchema,
  issueResponseSchema,
  issuesQuerySchema,
  issuesResponseSchema,
  pickerQuerySchema,
  projectIssuesParamsSchema,
  updateIssueRequestSchema,
} from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ZodTypeProvider } from '../../platform/http/zod.ts';
import { assignIssue } from './commands/assign-issue.command.ts';
import { changeIssueStatus } from './commands/change-issue-status.command.ts';
import { createIssue } from './commands/create-issue.command.ts';
import { deleteIssue } from './commands/delete-issue.command.ts';
import { updateIssue } from './commands/update-issue.command.ts';
import { getIssue } from './queries/get-issue.query.ts';
import { getIssueFields } from './queries/get-issue-fields.query.ts';
import { listAssignees } from './queries/list-assignees.query.ts';
import { listIssueActivities } from './queries/list-issue-activities.query.ts';
import { listIssues } from './queries/list-issues.query.ts';

/** Commands answer `204 No Content`: the client refetches what it shows. */
const NO_CONTENT = { 204: z.void() };

/**
 * A project's issues, and each issue by its key (`/api/v1/issues/WEB-42`). An issue the caller
 * does not see answers 404, like a project out of reach.
 */
export function registerIssueRoutes(app: FastifyInstance): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/api/v1/projects/:projectKey/issues',
    {
      config: { access: listIssues.access },
      schema: {
        params: projectIssuesParamsSchema,
        querystring: issuesQuerySchema,
        response: { 200: issuesResponseSchema },
      },
    },
    (request) =>
      listIssues.execute(request.executionContext, { ...request.params, ...request.query }),
  );

  routes.post(
    '/api/v1/projects/:projectKey/issues',
    {
      config: { access: createIssue.access },
      schema: {
        params: projectIssuesParamsSchema,
        body: createIssueRequestSchema,
        response: { 201: createIssueResponseSchema },
      },
    },
    async (request, reply) =>
      reply.status(201).send(
        await createIssue.execute(request.executionContext, {
          ...request.params,
          ...request.body,
        }),
      ),
  );

  routes.get(
    '/api/v1/projects/:projectKey/issue-fields',
    {
      config: { access: getIssueFields.access },
      schema: { params: projectIssuesParamsSchema, response: { 200: issueFieldsResponseSchema } },
    },
    (request) => getIssueFields.execute(request.executionContext, request.params),
  );

  routes.get(
    '/api/v1/projects/:projectKey/assignees',
    {
      config: { access: listAssignees.access },
      schema: {
        params: projectIssuesParamsSchema,
        querystring: pickerQuerySchema,
        response: { 200: assigneesResponseSchema },
      },
    },
    (request) =>
      listAssignees.execute(request.executionContext, { ...request.params, ...request.query }),
  );

  registerIssueKeyRoutes(app);
}

/** One issue, named by its key. */
function registerIssueKeyRoutes(app: FastifyInstance): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/api/v1/issues/:issueKey',
    {
      config: { access: getIssue.access },
      schema: { params: issueKeyParamsSchema, response: { 200: issueResponseSchema } },
    },
    (request) => getIssue.execute(request.executionContext, request.params),
  );

  routes.patch(
    '/api/v1/issues/:issueKey',
    {
      config: { access: updateIssue.access },
      schema: {
        params: issueKeyParamsSchema,
        body: updateIssueRequestSchema,
        response: NO_CONTENT,
      },
    },
    async (request, reply) =>
      reply.status(204).send(
        await updateIssue.execute(request.executionContext, {
          ...request.params,
          ...request.body,
        }),
      ),
  );

  routes.put(
    '/api/v1/issues/:issueKey/status',
    {
      config: { access: changeIssueStatus.access },
      schema: {
        params: issueKeyParamsSchema,
        body: changeIssueStatusRequestSchema,
        response: NO_CONTENT,
      },
    },
    async (request, reply) =>
      reply.status(204).send(
        await changeIssueStatus.execute(request.executionContext, {
          ...request.params,
          ...request.body,
        }),
      ),
  );

  routes.put(
    '/api/v1/issues/:issueKey/assignee',
    {
      config: { access: assignIssue.access },
      schema: {
        params: issueKeyParamsSchema,
        body: assignIssueRequestSchema,
        response: NO_CONTENT,
      },
    },
    async (request, reply) =>
      reply.status(204).send(
        await assignIssue.execute(request.executionContext, {
          ...request.params,
          ...request.body,
        }),
      ),
  );

  routes.delete(
    '/api/v1/issues/:issueKey',
    {
      config: { access: deleteIssue.access },
      schema: { params: issueKeyParamsSchema, response: NO_CONTENT },
    },
    async (request, reply) =>
      reply.status(204).send(await deleteIssue.execute(request.executionContext, request.params)),
  );

  routes.get(
    '/api/v1/issues/:issueKey/activities',
    {
      config: { access: listIssueActivities.access },
      schema: {
        params: issueKeyParamsSchema,
        querystring: issueActivitiesQuerySchema,
        response: { 200: issueActivitiesResponseSchema },
      },
    },
    (request) =>
      listIssueActivities.execute(request.executionContext, {
        ...request.params,
        ...request.query,
      }),
  );
}
