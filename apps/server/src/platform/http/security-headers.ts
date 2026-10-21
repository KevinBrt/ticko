import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

/** Browser features Toppo never uses; denying them limits what injected content could do. */
const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'serial=()',
  'bluetooth=()',
  'interest-cohort=()',
].join(', ');

/**
 * Strict security headers on every response. The CSP allows only same-origin resources:
 * no inline script, no third-party CDN, no framing, and runtime `<style>` tags only with the
 * request nonce. Keep it that way; loosening it needs a documented reason in ARCHITECTURE.md.
 */
export async function registerSecurityHeaders(
  app: FastifyInstance,
  { publicUrl }: { publicUrl: URL },
): Promise<void> {
  const isHttps = publicUrl.protocol === 'https:';

  await app.register(helmet, {
    // A fresh nonce per request, appended to script-src and style-src; see web-app.ts.
    enableCSPNonces: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"],
        workerSrc: ["'self'"],
        // Upgrading requests would break plain-HTTP deployments on a LAN.
        ...(isHttps ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    strictTransportSecurity: isHttps ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  app.addHook('onRequest', (_request, reply, done) => {
    reply.header('permissions-policy', PERMISSIONS_POLICY);
    done();
  });
}
