import type { FastifyInstance } from 'fastify';
import { HttpError } from './http-error.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site request forgery guard for every state-changing request, sign-in included (login
 * CSRF). Browsers always send `Origin` on such requests, and `Sec-Fetch-Site` when they support
 * Fetch Metadata; both must point at this instance. Non-browser clients send neither and are
 * not a CSRF vector.
 */
export function registerOriginCheck(app: FastifyInstance, { publicUrl }: { publicUrl: URL }): void {
  app.addHook('onRequest', (request, _reply, done) => {
    if (SAFE_METHODS.has(request.method)) {
      done();
      return;
    }
    const origin = request.headers.origin;
    const fetchSite = request.headers['sec-fetch-site'];
    const isCrossOrigin = origin !== undefined && origin !== publicUrl.origin;
    const isCrossSite = fetchSite === 'cross-site' || fetchSite === 'same-site';
    if (isCrossOrigin || isCrossSite) {
      done(new HttpError(403, 'CROSS_ORIGIN_REQUEST', 'Cross-origin requests are not allowed'));
      return;
    }
    done();
  });
}
