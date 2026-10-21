import type { FastifyInstance } from 'fastify';
import type { Access } from '../auth/access-control.ts';

declare module 'fastify' {
  interface FastifyContextConfig {
    /**
     * Who may call the route, enforced by `access-control.ts`. A feature route passes the access
     * of the operation it runs: `config: { access: inviteUser.access }`.
     */
    access?: Access;
    /** The response is produced by a vetted library (Better Auth), not by a Toppo handler. */
    delegated?: true;
  }
}

/**
 * Refuses, at startup, any route that does not state its access rule, and any API route
 * without a response schema. A forgotten check becomes a boot failure caught by tests,
 * never a silently open endpoint.
 */
export function enforceRouteContracts(app: FastifyInstance): void {
  app.addHook('onRoute', (route) => {
    const label = `${String(route.method)} ${route.url}`;
    if (route.config?.access === undefined) {
      throw new Error(`Route ${label} must declare config.access`);
    }
    const isApi = route.url.startsWith('/api/');
    if (isApi && route.schema?.response === undefined && route.config.delegated !== true) {
      throw new Error(`Route ${label} must declare a response schema`);
    }
  });
}
