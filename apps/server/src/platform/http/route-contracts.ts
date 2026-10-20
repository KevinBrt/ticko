import type { FastifyInstance } from 'fastify';

/**
 * Who may call a route. Declared on every route through `config.access`:
 * - `public`: anyone, signed in or not;
 * - `authenticated`: any signed-in user (enforced by `access-control.ts`).
 * Permission-based access (`{ permission: 'issue.update' }`) arrives with the permission checks.
 */
export type RouteAccess = 'public' | 'authenticated';

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: RouteAccess;
    /** The response is produced by a vetted library (Better Auth), not by a Ticko handler. */
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
