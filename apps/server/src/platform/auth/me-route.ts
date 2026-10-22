import { type Db, schema } from '@toppo/db';
import { type MeResponse, meResponseSchema } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '../http/zod.ts';
import { resolveActor } from './actor.ts';
import type { Auth } from './auth.ts';
import { managedBy } from './project-access.ts';

/**
 * `GET /api/v1/me`: the signed-in user, their permissions and whether they manage a project (the
 * web app shows the projects screen to them), or `null`. Public on purpose:
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
      if (!actor) {
        return { user: null };
      }
      const [managed] = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(managedBy(actor.id))
        .limit(1);
      return {
        user: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          permissions: [...actor.permissions],
          managesProjects: managed !== undefined,
        },
      };
    },
  );
}
