import type { FastifyInstance } from 'fastify';

/**
 * Who may call a route. Declared on every route through `config.access`.
 * Permission-based access (`{ permission: 'issue.update' }`) arrives with the permission catalog.
 */
export type RouteAccess = 'public';

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: RouteAccess;
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
    if (route.url.startsWith('/api/') && route.schema?.response === undefined) {
      throw new Error(`Route ${label} must declare a response schema`);
    }
  });
}
