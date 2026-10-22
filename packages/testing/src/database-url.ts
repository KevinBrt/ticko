/** Matches the `test-db` service of `docker/compose.dev.yml`, which binds to localhost only. */
const DEFAULT_SERVER_URL = 'postgres://toppo:toppo@127.0.0.1:54330/toppo_test';

/**
 * URL of a database on the PostgreSQL server used by tests. CI points `TEST_DATABASE_URL` at
 * its own service; the database name in that URL is the default.
 */
export function testDatabaseUrl(database?: string): string {
  const url = new URL(process.env['TEST_DATABASE_URL'] ?? DEFAULT_SERVER_URL);
  if (database !== undefined) {
    url.pathname = `/${database}`;
  }
  return url.toString();
}
