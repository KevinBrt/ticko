import { type MeResponse, meResponseSchema } from '@ticko/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '../http/zod.ts';
import type { Auth } from './auth.ts';
import { forwardSetCookies, toFetchHeaders } from './fetch-bridge.ts';

/**
 * `GET /api/v1/me`: the signed-in user, or `null`. Public on purpose: "nobody" is a normal
 * answer for the web app deciding between the sign-in page and the application.
 */
export function registerMeRoute(app: FastifyInstance, { auth }: { auth: Auth }): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/v1/me',
    {
      config: { access: 'public' },
      schema: { response: { 200: meResponseSchema } },
    },
    async (request, reply): Promise<MeResponse> => {
      const { headers, response: session } = await auth.api.getSession({
        headers: toFetchHeaders(request),
        returnHeaders: true,
      });
      forwardSetCookies(headers, reply);
      reply.header('cache-control', 'no-store');
      return {
        user: session
          ? { id: session.user.id, name: session.user.name, email: session.user.email }
          : null,
      };
    },
  );
}
