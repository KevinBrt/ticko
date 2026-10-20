import postgres from 'postgres';

export interface DatabaseOptions {
  url: string;
  /** Maximum number of pooled connections. */
  maxConnections?: number;
}

export interface Database {
  /** Resolves when PostgreSQL answers a trivial query, rejects otherwise. */
  ping(): Promise<void>;
  /** Waits for running queries, then closes every connection. */
  close(): Promise<void>;
}

const CONNECT_TIMEOUT_SECONDS = 5;
const IDLE_TIMEOUT_SECONDS = 30;
const CLOSE_TIMEOUT_SECONDS = 5;

export function createDatabase({ url, maxConnections = 10 }: DatabaseOptions): Database {
  const sql = postgres(url, {
    max: maxConnections,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connection: { application_name: 'ticko' },
  });

  return {
    async ping() {
      await sql`select 1`;
    },
    async close() {
      await sql.end({ timeout: CLOSE_TIMEOUT_SECONDS });
    },
  };
}
