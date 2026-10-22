import type { FastifyInstance, HTTPMethods } from 'fastify';
import { type Access, isProjectAccess } from '../auth/access-control.ts';

/** What a registered route promises: who may call it, and whether its use is rate limited. */
export interface RouteContract {
  method: HTTPMethods;
  url: string;
  access: Access;
  rateLimited: boolean;
}

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

  interface FastifyInstance {
    /** Every route registered so far with its access rule, for the generated permission tests. */
    readonly routeContracts: readonly RouteContract[];
  }
}

/**
 * Refuses, at startup, any route that does not state its access rule, and any API route
 * without a response schema. A forgotten check becomes a boot failure caught by tests,
 * never a silently open endpoint.
 */
export function enforceRouteContracts(app: FastifyInstance): void {
  const contracts: RouteContract[] = [];
  app.decorate('routeContracts', contracts);

  app.addHook('onRoute', (route) => {
    const label = `${String(route.method)} ${route.url}`;
    const access = route.config?.access;
    if (access === undefined) {
      throw new Error(`Route ${label} must declare config.access`);
    }
    const isApi = route.url.startsWith('/api/');
    if (isApi && route.schema?.response === undefined && route.config?.delegated !== true) {
      throw new Error(`Route ${label} must declare a response schema`);
    }
    // Access to a project is checked before the body is read: the project must be in the path.
    if (isProjectAccess(access) && !route.url.includes(`:${access.project}`)) {
      throw new Error(`Route ${label} must name its project in the path (:${access.project})`);
    }
    for (const method of [route.method].flat()) {
      contracts.push({
        method,
        url: route.url,
        access,
        rateLimited: route.config?.rateLimit !== undefined,
      });
    }
  });
}
