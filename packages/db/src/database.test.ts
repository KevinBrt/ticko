import { testDatabaseUrl } from '@ticko/testing';
import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from './database.ts';

describe('createDatabase (PostgreSQL)', () => {
  const database = createDatabase({ url: testDatabaseUrl(), maxConnections: 2 });

  afterAll(async () => {
    await database.close();
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
