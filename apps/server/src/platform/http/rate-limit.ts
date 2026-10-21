import { type Db, schema } from '@toppo/db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { HttpError } from './http-error.ts';

const { rateLimits } = schema;

/** At most `max` requests per client address in each window of `windowSeconds`. */
export interface RateLimit {
  max: number;
  windowSeconds: number;
}

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Required on public routes that write: they are open to anyone (checked by tests). */
    rateLimit?: RateLimit;
  }
}

/**
 * Counts requests per route and client address in PostgreSQL, so every server process shares
 * the counts. It uses Better Auth's table, under keys of its own (`toppo:`), with one atomic
 * upsert per request. Runs before the body is parsed.
 */
export function registerRateLimit(app: FastifyInstance, { db }: { db: Db }): void {
  app.addHook('onRequest', async (request, reply) => {
    const limit = request.routeOptions.config.rateLimit;
    if (!limit) {
      return;
    }
    const now = Date.now();
    const windowStart = now - limit.windowSeconds * 1000;
    const expired = sql`${rateLimits.lastRequest} <= ${windowStart}`;
    // `last_request` holds the start of the current window.
    const [counter] = await db
      .insert(rateLimits)
      .values({
        key: `toppo:${request.method} ${request.routeOptions.url}:${request.ip}`,
        count: 1,
        lastRequest: now,
      })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
          lastRequest: sql`case when ${expired} then ${now} else ${rateLimits.lastRequest} end`,
        },
      })
      .returning({ count: rateLimits.count, windowStartedAt: rateLimits.lastRequest });
    if (counter && counter.count > limit.max) {
      const retryAfter = Math.ceil((counter.windowStartedAt - windowStart) / 1000);
      reply.header('retry-after', String(Math.max(retryAfter, 1)));
      throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many requests, try again later');
    }
  });
}
