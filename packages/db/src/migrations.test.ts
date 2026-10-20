import { DEFAULT_ROLE_IDS, DEFAULT_ROLES } from '@ticko/core';
import { createEmptyTestDatabase, createTestDatabase, type TestDatabase } from '@ticko/testing';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../vitest.global-setup.ts';
import { createDatabase, type Database } from './database.ts';
import { instanceSettings, roles, users } from './schema/index.ts';
import { uuidv7 } from './uuid.ts';

async function appliedMigrations(database: Database): Promise<number> {
  const rows = await database.db.execute<{ count: string }>(
    sql`select count(*) as count from drizzle.__drizzle_migrations`,
  );
  return Number(rows[0]?.count);
}

describe('migrations on an empty database', () => {
  let empty: TestDatabase;
  const databases: Database[] = [];

  beforeAll(async () => {
    empty = await createEmptyTestDatabase();
  });

  afterAll(async () => {
    await Promise.all(databases.map((database) => database.close()));
    await empty.drop();
  });

  it('applies every migration once, even when servers start concurrently', async () => {
    const first = createDatabase({ url: empty.url, maxConnections: 2 });
    const second = createDatabase({ url: empty.url, maxConnections: 2 });
    databases.push(first, second);

    await Promise.all([first.migrate(MIGRATIONS_FOLDER), second.migrate(MIGRATIONS_FOLDER)]);

    expect(await appliedMigrations(first)).toBeGreaterThanOrEqual(2);
  });

  it('does nothing when run again', async () => {
    const [database] = databases;
    if (!database) {
      throw new Error('previous test did not run');
    }
    const before = await appliedMigrations(database);

    await database.migrate(MIGRATIONS_FOLDER);

    expect(await appliedMigrations(database)).toBe(before);
  });
});

describe('initial data and constraints', () => {
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

  it('seeds exactly the default roles of @ticko/core', async () => {
    const seeded = await database.db
      .select({
        id: roles.id,
        name: roles.name,
        scope: roles.scope,
        permissions: roles.permissions,
      })
      .from(roles);

    const byId = (left: { id: string }, right: { id: string }) => left.id.localeCompare(right.id);
    expect(seeded.sort(byId)).toStrictEqual(
      DEFAULT_ROLES.map(({ id, name, scope, permissions }) => ({
        id,
        name,
        scope,
        permissions: [...permissions],
      })).sort(byId),
    );
  });

  it('creates the instance settings row, waiting for setup', async () => {
    const rows = await database.db.select().from(instanceSettings);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, setupCompletedAt: null });
  });

  it('keeps instance settings to a single row', async () => {
    await expect(database.db.insert(instanceSettings).values({ id: 2 })).rejects.toThrow();
  });

  it('drops the instance name, which the domain already provides', async () => {
    const columns = await database.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'instance_settings'`,
    );

    expect(columns.map((column) => column.column_name)).not.toContain('name');
  });

  it('gives new users the default instance role', async () => {
    const [user] = await database.db
      .insert(users)
      .values({ name: 'Ada', email: `ada-${uuidv7()}@example.com` })
      .returning();

    expect(user?.instanceRoleId).toBe(DEFAULT_ROLE_IDS.instanceTeam);
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('stores emails in lower case only', async () => {
    await expect(
      database.db.insert(users).values({ name: 'Ada', email: 'Ada@Example.com' }),
    ).rejects.toThrow();
  });

  it('refuses two roles with the same name, ignoring case, in one scope', async () => {
    await expect(
      database.db.insert(roles).values({ name: 'team', scope: 'instance' }),
    ).rejects.toThrow();
    await expect(
      database.db.insert(roles).values({ name: 'Reporter', scope: 'project' }),
    ).resolves.toBeDefined();
  });

  it('refuses an unknown role scope', async () => {
    await expect(
      database.db.execute(
        sql`insert into roles (id, name, scope) values (${uuidv7()}, 'X', 'global')`,
      ),
    ).rejects.toThrow();
  });

  it('refuses to delete a role still granted to a user', async () => {
    await expect(
      database.db.delete(roles).where(eq(roles.id, DEFAULT_ROLE_IDS.instanceTeam)),
    ).rejects.toThrow();
  });
});
