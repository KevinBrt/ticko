import {
  assignableRolesResponseSchema,
  changeUserRoleRequestSchema,
  userIdParamsSchema,
  usersResponseSchema,
} from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ZodTypeProvider } from '../../platform/http/zod.ts';
import { changeUserRole } from './commands/change-user-role.command.ts';
import { deactivateUser } from './commands/deactivate-user.command.ts';
import { reactivateUser } from './commands/reactivate-user.command.ts';
import { listAssignableRoles } from './queries/list-assignable-roles.query.ts';
import { listUsers } from './queries/list-users.query.ts';

/** Commands answer `204 No Content`: the client refetches what it shows. */
const NO_CONTENT = { 204: z.void() };

/** Accounts of the instance, managed by holders of `instance.users.manage`. */
export function registerUserRoutes(app: FastifyInstance): void {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get(
    '/api/v1/users',
    {
      config: { access: listUsers.access },
      schema: { response: { 200: usersResponseSchema } },
    },
    (request) => listUsers.execute(request.executionContext, {}),
  );

  routes.get(
    '/api/v1/users/roles',
    {
      config: { access: listAssignableRoles.access },
      schema: { response: { 200: assignableRolesResponseSchema } },
    },
    (request) => listAssignableRoles.execute(request.executionContext, {}),
  );

  routes.patch(
    '/api/v1/users/:userId',
    {
      config: { access: changeUserRole.access },
      schema: {
        params: userIdParamsSchema,
        body: changeUserRoleRequestSchema,
        response: NO_CONTENT,
      },
    },
    async (request, reply) =>
      reply.status(204).send(
        await changeUserRole.execute(request.executionContext, {
          ...request.params,
          ...request.body,
        }),
      ),
  );

  routes.post(
    '/api/v1/users/:userId/deactivate',
    {
      config: { access: deactivateUser.access },
      schema: { params: userIdParamsSchema, response: NO_CONTENT },
    },
    async (request, reply) =>
      reply
        .status(204)
        .send(await deactivateUser.execute(request.executionContext, request.params)),
  );

  routes.post(
    '/api/v1/users/:userId/reactivate',
    {
      config: { access: reactivateUser.access },
      schema: { params: userIdParamsSchema, response: NO_CONTENT },
    },
    async (request, reply) =>
      reply
        .status(204)
        .send(await reactivateUser.execute(request.executionContext, request.params)),
  );
}
