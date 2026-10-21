import { DEFAULT_ROLE_IDS, DEFAULT_ROLES } from '@toppo/core';
import { createEmptyTestDatabase, createTestDatabase, type TestDatabase } from '@toppo/testing';
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

  it('seeds exactly the default roles of @toppo/core', async () => {
    const seeded = await database.db
      .select({
        id: roles.id,
        name: roles.name,
        audience: roles.audience,
        grantsAll: roles.grantsAll,
        color: roles.color,
        permissions: roles.permissions,
      })
      .from(roles);

    const byId = (left: { id: string }, right: { id: string }) => left.id.localeCompare(right.id);
    expect(seeded.sort(byId)).toStrictEqual(
      DEFAULT_ROLES.map(({ id, name, audience, grantsAll, color, permissions }) => ({
        id,
        name,
        audience,
        grantsAll,
        color,
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

  it('creates users active, with the instance role they were given', async () => {
    const [user] = await database.db
      .insert(users)
      .values({
        name: 'Ada',
        email: `ada-${uuidv7()}@example.com`,
        instanceRoleId: DEFAULT_ROLE_IDS.team,
      })
      .returning();

    expect(user?.instanceRoleId).toBe(DEFAULT_ROLE_IDS.team);
    expect(user?.deactivatedAt).toBeNull();
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses a user whose instance role was not chosen', async () => {
    await expect(
      database.db.execute(
        sql`insert into users (id, name, email) values (${uuidv7()}, 'Ada', 'ada@example.com')`,
      ),
    ).rejects.toThrow();
  });

  it('stores emails in lower case only', async () => {
    await expect(
      database.db.insert(users).values({
        name: 'Ada',
        email: 'Ada@Example.com',
        instanceRoleId: DEFAULT_ROLE_IDS.team,
      }),
    ).rejects.toThrow();
  });

  it('refuses two roles with the same name, ignoring case', async () => {
    await expect(database.db.insert(roles).values({ name: 'team' })).rejects.toThrow();
    await expect(database.db.insert(roles).values({ name: 'Reporter' })).resolves.toBeDefined();
  });

  it('refuses an unknown audience or color', async () => {
    await expect(
      database.db.execute(
        sql`insert into roles (id, name, audience) values (${uuidv7()}, 'X', 'everyone')`,
      ),
    ).rejects.toThrow();
    await expect(
      database.db.execute(
        sql`insert into roles (id, name, color) values (${uuidv7()}, 'Y', '#f00')`,
      ),
    ).rejects.toThrow();
  });

  it('keeps a single system role, never a client one', async () => {
    await expect(
      database.db.insert(roles).values({ name: 'Second system role', grantsAll: true }),
    ).rejects.toThrow();
    await database.db
      .update(roles)
      .set({ grantsAll: false })
      .where(eq(roles.id, DEFAULT_ROLE_IDS.administrator));
    await expect(
      database.db
        .insert(roles)
        .values({ name: 'Client system role', grantsAll: true, audience: 'client' }),
    ).rejects.toThrow();
    await database.db
      .update(roles)
      .set({ grantsAll: true })
      .where(eq(roles.id, DEFAULT_ROLE_IDS.administrator));
  });

  it('refuses to delete a role still granted to a user', async () => {
    await database.db.insert(users).values({
      name: 'Grace',
      email: `grace-${uuidv7()}@example.com`,
      instanceRoleId: DEFAULT_ROLE_IDS.requester,
    });

    await expect(
      database.db.delete(roles).where(eq(roles.id, DEFAULT_ROLE_IDS.requester)),
    ).rejects.toThrow();
  });
});
