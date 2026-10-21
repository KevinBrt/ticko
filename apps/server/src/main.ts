import { fileURLToPath } from 'node:url';
import { createDatabase, waitForDatabase } from '@toppo/db';
import { buildApp, createServices } from './app.ts';
import { getSetupStatus } from './features/setup/queries/get-setup-status.query.ts';
import { generateSetupCode } from './features/setup/utils/setup-code.util.ts';
import { createAuth } from './platform/auth/auth.ts';
import { type Config, ConfigError, loadConfig } from './platform/config/config.ts';
import { resolveSecret } from './platform/config/secret.ts';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/*
 * Resolved from the entry point, which sits at the same depth in source (`src/main.ts`) and in
 * the bundle (`dist/main.js`). Never move these into a shared module: bundle chunks live elsewhere.
 */
const WEB_ROOT = fileURLToPath(new URL('../../web/dist', import.meta.url));
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../../packages/db/migrations', import.meta.url),
);

function loadConfigOrExit(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\nSee .env.example for every supported variable.\n`);
      process.exit(1);
    }
    throw error;
  }
}

const config = loadConfigOrExit();
const database = createDatabase({ url: config.databaseUrl });
const auth = createAuth({
  db: database.db,
  secret: await resolveSecret(config.secret, config.dataDir),
  publicUrl: config.publicUrl,
});
const setupCode = config.setupCode ?? generateSetupCode();
const app = await buildApp({ config, database, auth, setupCode, webRoot: WEB_ROOT });

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down');
  const forceExit = setTimeout(() => {
    app.log.error('Graceful shutdown timed out, exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  await app.close();
  await database.close();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, (received) => {
    void shutdown(received);
  });
}

try {
  await waitForDatabase(database, {
    onRetry: (attempt) => app.log.warn({ attempt }, 'Waiting for PostgreSQL'),
  });
  await database.migrate(MIGRATIONS_FOLDER);
  await app.listen({ host: config.host, port: config.port });

  const { required } = await getSetupStatus.execute(
    {
      db: database.db,
      actor: null,
      log: app.log,
      services: createServices({ auth, setupCode, publicUrl: config.publicUrl }),
    },
    {},
  );
  if (required) {
    const origin = config.publicUrl.origin;
    app.log.warn(
      config.setupCode
        ? `Toppo is not set up yet: open ${origin} and enter the setup code from TOPPO_SETUP_CODE`
        : `Toppo is not set up yet: open ${origin} and enter the setup code ${setupCode}`,
    );
  }
} catch (error) {
  app.log.fatal({ err: error }, 'Toppo failed to start');
  await database.close();
  process.exit(1);
}
