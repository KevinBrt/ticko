import { can, type InstancePermission } from '@toppo/core';
import type { Db } from '@toppo/db';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../http/http-error.ts';
import { type Actor, resolveActor } from './actor.ts';
import type { Auth } from './auth.ts';

/**
 * Who may call a route or run a command or query:
 * - `public`: anyone, signed in or not;
 * - `authenticated`: any signed-in user;
 * - `{ permission }`: a signed-in user whose instance role grants this permission.
 * Project permissions, checked against the project an input points to, arrive with projects.
 */
export type Access = 'public' | 'authenticated' | { permission: InstancePermission };

declare module 'fastify' {
  interface FastifyRequest {
    /** The signed-in user, set on routes whose access requires one. */
    actor: Actor | null;
  }
}

/** Throws the HTTP error that `access` calls for when `actor` may not go further. */
export function assertAccess(access: Access, actor: Actor | null): void {
  if (access === 'public') {
    return;
  }
  if (!actor) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  if (access !== 'authenticated' && !can(actor.permissions, access.permission)) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have permission to do this');
  }
}

/**
 * Enforces `config.access` before the body is even parsed: a caller without access learns
 * nothing about a protected route, not even its validation rules.
 */
export function registerAccessControl(
  app: FastifyInstance,
  { auth, db }: { auth: Auth; db: Db },
): void {
  app.decorateRequest('actor', null);

  app.addHook('onRequest', async (request, reply) => {
    const access = request.routeOptions.config.access ?? 'public';
    if (access === 'public') {
      return;
    }
    request.actor = await resolveActor({ auth, db }, request, reply);
    assertAccess(access, request.actor);
  });
}
