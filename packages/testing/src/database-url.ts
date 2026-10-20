/** Matches the `db` service of `docker/compose.dev.yml`, which binds to localhost only. */
const DEFAULT_TEST_DATABASE_URL = 'postgres://ticko:ticko@127.0.0.1:54329/ticko_test';

/** The database integration tests run against. CI points `TEST_DATABASE_URL` at its own service. */
export function testDatabaseUrl(): string {
  return process.env['TEST_DATABASE_URL'] ?? DEFAULT_TEST_DATABASE_URL;
}
