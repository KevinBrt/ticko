import { updateAccountRequestSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ZodTypeProvider } from '../../platform/http/zod.ts';
import { updateAccount } from './commands/update-account.command.ts';

/** One's own account. The password changes through Better Auth (`platform/auth/auth-routes.ts`). */
export function registerAccountRoutes(app: FastifyInstance): void {
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/api/v1/me',
    {
      config: { access: updateAccount.access },
      schema: { body: updateAccountRequestSchema, response: { 204: z.void() } },
    },
    async (request, reply) =>
      reply.status(204).send(await updateAccount.execute(request.executionContext, request.body)),
  );
}
