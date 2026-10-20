import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config.ts';
import { registerErrorHandler } from './http/error-handler.ts';
import { enforceRouteContracts } from './http/route-contracts.ts';
import { registerSecurityHeaders } from './http/security-headers.ts';
import { registerWebApp } from './http/web-app.ts';
import { serializerCompiler, validatorCompiler } from './http/zod.ts';
import { type HealthDependencies, registerHealthRoute } from './routes/health.ts';

export interface AppDependencies {
  config: Pick<Config, 'publicUrl' | 'logLevel' | 'trustProxy'>;
  database: HealthDependencies['database'];
  /** Directory of the compiled web app. Not configurable: it ships inside the image. */
  webRoot: string;
}

const BODY_LIMIT_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

/** Builds the Fastify application without listening, so tests can drive it with `inject()`. */
export async function buildApp({
  config,
  database,
  webRoot,
}: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    },
    trustProxy: config.trustProxy,
    bodyLimit: BODY_LIMIT_BYTES,
    requestTimeout: REQUEST_TIMEOUT_MS,
    // Never trust a client-provided request id: it ends up in logs.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  enforceRouteContracts(app);
  registerErrorHandler(app);
  await registerSecurityHeaders(app, { publicUrl: config.publicUrl });

  app.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id);
    done();
  });

  registerHealthRoute(app, { database });

  const servesWebApp = await registerWebApp(app, webRoot);
  if (!servesWebApp) {
    app.log.info('Web app not built: only the API is served');
  }

  return app;
}
