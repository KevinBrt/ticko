import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { testDatabaseUrl } from './database-url.ts';

const COMPOSE_FILE = fileURLToPath(new URL('../../../docker/compose.dev.yml', import.meta.url));

/** Duplicate database names when several suites create the same database at once. */
const ALREADY_EXISTS_CODES = new Set(['42P04', '23505']);

/**
 * Makes sure the test PostgreSQL server answers. Locally, starts the development database with
 * Docker Compose when needed; in CI, the workflow provides the server.
 */
export async function ensurePostgres(): Promise<void> {
  if (await isReachable()) {
    return;
  }
  if (process.env['CI']) {
    throw new Error(`PostgreSQL is not reachable at ${redact(testDatabaseUrl())}.`);
  }
  try {
    execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'up', '--detach', '--wait', 'db'], {
      stdio: 'inherit',
    });
  } catch (error) {
    // Test suites of several packages start in parallel: another one may be creating the very
    // same container right now, which makes this attempt fail. Wait for its database instead.
    if (await becomesReachable(STARTUP_TIMEOUT_MS)) {
      return;
    }
    throw new Error(
      'PostgreSQL is not reachable and could not be started with Docker. ' +
        'Start Docker, or run `npm run db:up`, or set TEST_DATABASE_URL.',
      { cause: error },
    );
  }
}

const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

async function becomesReachable(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable()) {
      return true;
    }
    await setTimeout(POLL_INTERVAL_MS);
  }
  return false;
}

/**
 * Seconds to connect when creating or dropping a database: test files start side by side, and
 * a server busy with them can take a while to answer.
 */
const MAINTENANCE_CONNECT_TIMEOUT = 10;
/** Seconds to tell whether the server is up at all, before trying to start it. */
const PROBE_CONNECT_TIMEOUT = 2;

/** Runs `task` on the always-present `postgres` database, to create or drop other databases. */
export async function withMaintenanceConnection<T>(
  task: (sql: postgres.Sql) => Promise<T>,
  connectTimeout = MAINTENANCE_CONNECT_TIMEOUT,
): Promise<T> {
  const sql = postgres(testDatabaseUrl('postgres'), {
    max: 1,
    connect_timeout: connectTimeout,
    onnotice: () => undefined,
  });
  try {
    return await task(sql);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function createDatabase(name: string, template?: string): Promise<void> {
  await withMaintenanceConnection(async (sql) => {
    const statement = template
      ? sql`create database ${sql(name)} template ${sql(template)}`
      : sql`create database ${sql(name)}`;
    await statement.catch((error: unknown) => {
      const code = error instanceof postgres.PostgresError ? error.code : undefined;
      if (!(code && ALREADY_EXISTS_CODES.has(code))) {
        throw error;
      }
    });
  });
}

export async function dropDatabase(name: string): Promise<void> {
  await withMaintenanceConnection(async (sql) => {
    await sql`drop database if exists ${sql(name)} with (force)`;
  });
}

/** Drops then creates an empty database, e.g. for a fresh end-to-end run. */
export async function recreateDatabase(name: string): Promise<void> {
  await dropDatabase(name);
  await createDatabase(name);
}

async function isReachable(): Promise<boolean> {
  try {
    await withMaintenanceConnection((sql) => sql`select 1`, PROBE_CONNECT_TIMEOUT);
    return true;
  } catch {
    return false;
  }
}

function redact(url: string): string {
  const safe = new URL(url);
  safe.password = '';
  return safe.toString();
}
