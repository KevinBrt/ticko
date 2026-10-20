import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { testDatabaseUrl } from './database-url.ts';

const COMPOSE_FILE = fileURLToPath(new URL('../../../docker/compose.dev.yml', import.meta.url));

/**
 * Vitest global setup for suites that need PostgreSQL.
 * Locally, starts the development database with Docker Compose when it is not running yet,
 * then creates the test database if missing. In CI, the database is provided by the workflow.
 */
export async function setup(): Promise<void> {
  const url = new URL(testDatabaseUrl());

  if (!(await isReachable(url))) {
    if (process.env['CI']) {
      throw new Error(`PostgreSQL is not reachable at ${redact(url)}.`);
    }
    startDevelopmentDatabase();
  }

  await ensureDatabaseExists(url);
}

async function isReachable(url: URL): Promise<boolean> {
  const sql = postgres(maintenanceUrl(url), {
    max: 1,
    connect_timeout: 2,
    onnotice: () => undefined,
  });
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

function startDevelopmentDatabase(): void {
  try {
    execFileSync('docker', ['compose', '-f', COMPOSE_FILE, 'up', '--detach', '--wait', 'db'], {
      stdio: 'inherit',
    });
  } catch (error) {
    throw new Error(
      'PostgreSQL is not reachable and could not be started with Docker. ' +
        'Start Docker, or run `npm run db:up`, or set TEST_DATABASE_URL.',
      { cause: error },
    );
  }
}

async function ensureDatabaseExists(url: URL): Promise<void> {
  const name = decodeURIComponent(url.pathname.slice(1));
  const sql = postgres(maintenanceUrl(url), { max: 1, onnotice: () => undefined });
  try {
    const existing = await sql`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) {
      await sql`create database ${sql(name)}`.catch(ignoreDuplicateDatabase);
    }
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Test suites of several packages start in parallel and may race to create the database. */
function ignoreDuplicateDatabase(error: unknown): void {
  const DUPLICATE_DATABASE = '42P04';
  const UNIQUE_VIOLATION = '23505';
  const code = error instanceof postgres.PostgresError ? error.code : undefined;
  if (code !== DUPLICATE_DATABASE && code !== UNIQUE_VIOLATION) {
    throw error;
  }
}

/** Same server, `postgres` database: always exists, so it can be used to create the test database. */
function maintenanceUrl(url: URL): string {
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  return maintenance.toString();
}

function redact(url: URL): string {
  const safe = new URL(url);
  safe.password = '';
  return safe.toString();
}
