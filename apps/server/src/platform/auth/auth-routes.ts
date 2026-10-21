import type { FastifyInstance, HTTPMethods } from 'fastify';
import { AUTH_BASE_PATH, type Auth } from './auth.ts';
import { sendFetchResponse, toFetchRequest } from './fetch-bridge.ts';

/**
 * Better Auth endpoints Toppo exposes. Everything else Better Auth offers (sign-up, password
 * reset by email, account deletion…) stays unreachable until a feature needs it.
 */
const EXPOSED_ENDPOINTS: readonly { method: HTTPMethods; path: string }[] = [
  { method: 'POST', path: '/sign-in/email' },
  { method: 'POST', path: '/sign-out' },
  { method: 'GET', path: '/get-session' },
];

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
}
