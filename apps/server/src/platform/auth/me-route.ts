import type { Db } from '@toppo/db';
import { type MeResponse, meResponseSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '../http/zod.ts';
import { resolveActor } from './actor.ts';
import type { Auth } from './auth.ts';

/**
 * `GET /api/v1/me`: the signed-in user and their permissions, or `null`. Public on purpose:
 * "nobody" is a normal answer for the web app deciding between the sign-in page and the app.
 */
export function registerMeRoute(app: FastifyInstance, { auth, db }: { auth: Auth; db: Db }): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/v1/me',
    {
      config: { access: 'public' },
      schema: { response: { 200: meResponseSchema } },
    },
    async (request, reply): Promise<MeResponse> => {
      const actor = await resolveActor({ auth, db }, request, reply);
      reply.header('cache-control', 'no-store');
      return {
        user: actor
          ? {
              id: actor.id,
              name: actor.name,
              email: actor.email,
              permissions: [...actor.permissions],
            }
          : null,
      };
    },
  );
}
