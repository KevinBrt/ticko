import { changePasswordRequestSchema } from '@toppo/shared';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import { z } from 'zod';
import type { RateLimit } from '../http/rate-limit.ts';
import type { ZodTypeProvider } from '../http/zod.ts';
import { AUTH_BASE_PATH, type Auth } from './auth.ts';
import { forwardSetCookies, sendFetchResponse, toFetchRequest } from './fetch-bridge.ts';

/**
 * Better Auth endpoints Toppo exposes as they are. Everything else Better Auth offers (sign-up,
 * password reset by email, account deletion…) stays unreachable until a feature needs it.
 */
const EXPOSED_ENDPOINTS: readonly { method: HTTPMethods; path: string }[] = [
  { method: 'POST', path: '/sign-in/email' },
  { method: 'POST', path: '/sign-out' },
  { method: 'GET', path: '/get-session' },
];

/** Changing one's password tests the current one: limited like signing in. */
const CHANGE_PASSWORD_RATE_LIMIT: RateLimit = { max: 5, windowSeconds: 600 };

export function registerAuthRoutes(
  app: FastifyInstance,
  { auth, publicUrl }: { auth: Auth; publicUrl: URL },
): void {
  for (const { method, path } of EXPOSED_ENDPOINTS) {
    app.route({
      method,
      url: `${AUTH_BASE_PATH}${path}`,
      // Better Auth validates these requests and owns their responses.
      config: { access: 'public', delegated: true },
      handler: async (request, reply) =>
        sendFetchResponse(await auth.handler(toFetchRequest(request, publicUrl.origin)), reply),
    });
  }

  // Validated by Toppo, then by Better Auth, which checks the current password and answers
  // refusals itself. Every other device is signed out whatever the client asks, and the new
  // session's token stays in its HttpOnly cookie: success carries no body.
  app.withTypeProvider<ZodTypeProvider>().post(
    `${AUTH_BASE_PATH}/change-password`,
    {
      config: { access: 'authenticated', rateLimit: CHANGE_PASSWORD_RATE_LIMIT },
      schema: { body: changePasswordRequestSchema, response: { 204: z.void() } },
    },
    async (request, reply) => {
      const response = await auth.handler(
        toFetchRequest(request, publicUrl.origin, { ...request.body, revokeOtherSessions: true }),
      );
      if (!response.ok) {
        return sendFetchResponse(response, reply);
      }
      forwardSetCookies(response.headers, reply);
      return reply.status(204).send();
    },
  );
}
