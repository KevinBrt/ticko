import type { CurrentUser } from '@toppo/shared';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../http/http-error.ts';
import type { Auth } from './auth.ts';
import { forwardSetCookies, toFetchHeaders } from './fetch-bridge.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** The signed-in user, set on routes whose access requires one. */
    currentUser: CurrentUser | null;
  }
}

/**
 * Enforces `config.access` before the body is even parsed: an anonymous caller learns nothing
 * about a protected route, not even its validation rules.
 */
export function registerAccessControl(app: FastifyInstance, { auth }: { auth: Auth }): void {
  app.decorateRequest('currentUser', null);

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config.access !== 'authenticated') {
      return;
    }
    const { headers, response: session } = await auth.api.getSession({
      headers: toFetchHeaders(request),
      returnHeaders: true,
    });
    if (!session) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    // A sliding session renews its cookie from time to time.
    forwardSetCookies(headers, reply);
    request.currentUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  });
}
