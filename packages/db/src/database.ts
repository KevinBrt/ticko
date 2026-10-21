import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/index.ts';

export type Db = PostgresJsDatabase<typeof schema>;

export interface DatabaseOptions {
  url: string;
  /** Maximum number of pooled connections. */
  maxConnections?: number;
}

export interface Database {
  /** Typed query builder over the Toppo schema. */
  db: Db;
  /** Resolves when PostgreSQL answers a trivial query, rejects otherwise. */
  ping(): Promise<void>;
  /**
   * Applies pending migrations in one transaction. A session-level advisory lock makes
   * concurrent server starts wait for each other instead of migrating twice.
   */
  migrate(migrationsFolder: string): Promise<void>;
  /** Waits for running queries, then closes every connection. */
  close(): Promise<void>;
}

const CONNECT_TIMEOUT_SECONDS = 5;
const IDLE_TIMEOUT_SECONDS = 30;
const CLOSE_TIMEOUT_SECONDS = 5;
/** Arbitrary but fixed: identifies Toppo's migration lock among other advisory locks. */
const MIGRATION_LOCK_KEY = 7_461_756_323;

function connect(url: string, maxConnections: number): postgres.Sql {
  return postgres(url, {
    max: maxConnections,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connection: { application_name: 'toppo' },
    // Notices such as "schema already exists, skipping" are expected during migrations.
    onnotice: () => undefined,
  });
}

export function createDatabase({ url, maxConnections = 10 }: DatabaseOptions): Database {
  const sql = connect(url, maxConnections);

  return {
    db: drizzle({ client: sql, schema }),
    async ping() {
      await sql`select 1`;
    },
    async migrate(migrationsFolder) {
      // A single connection, so the lock and the migration share one session; closing it
      // releases the lock even if the migration fails.
      const session = connect(url, 1);
      try {
        await session`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
        await migrate(drizzle({ client: session }), { migrationsFolder });
      } finally {
        await session.end({ timeout: CLOSE_TIMEOUT_SECONDS });
      }
    },
    async close() {
      await sql.end({ timeout: CLOSE_TIMEOUT_SECONDS });
    },
  };
}
