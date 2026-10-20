import { createTestDatabase, type TestDatabase } from '@ticko/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './database.ts';

describe('createDatabase (PostgreSQL)', () => {
  let testDatabase: TestDatabase;
  let database: Database;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    database = createDatabase({ url: testDatabase.url, maxConnections: 2 });
  });

  afterAll(async () => {
    await database.close();
    await testDatabase.drop();
  });

  it('answers a ping', async () => {
    await expect(database.ping()).resolves.toBeUndefined();
  });

  it('rejects a ping when the server is unreachable', async () => {
    const unreachable = createDatabase({ url: 'postgres://ticko:ticko@127.0.0.1:1/ticko' });
    try {
      await expect(unreachable.ping()).rejects.toThrow();
    } finally {
      await unreachable.close();
    }
  });
});
