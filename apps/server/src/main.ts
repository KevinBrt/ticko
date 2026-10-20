import { fileURLToPath } from 'node:url';
import { createDatabase, waitForDatabase } from '@ticko/db';
import { buildApp } from './app.ts';
import { type Config, ConfigError, loadConfig } from './config.ts';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Resolved from the entry point, which sits at the same depth in source (`src/main.ts`) and in
 * the bundle (`dist/main.js`). Never move this into a shared module: bundle chunks live elsewhere.
 */
const WEB_ROOT = fileURLToPath(new URL('../../web/dist', import.meta.url));

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
const app = await buildApp({ config, database, webRoot: WEB_ROOT });

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
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.fatal({ err: error }, 'Ticko failed to start');
  await database.close();
  process.exit(1);
}
