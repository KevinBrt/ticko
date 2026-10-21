import { DEFAULT_ROLE_IDS, DEFAULT_ROLES } from '@toppo/core';
import { createEmptyTestDatabase, createTestDatabase, type TestDatabase } from '@toppo/testing';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../vitest.global-setup.ts';
import { createDatabase, type Database } from './database.ts';
import { instanceSettings, invitations, roles, users } from './schema/index.ts';
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
        grantsAll: roles.grantsAll,
        color: roles.color,
        permissions: roles.permissions,
      })
      .from(roles);

    const byId = (left: { id: string }, right: { id: string }) => left.id.localeCompare(right.id);
    expect(seeded.sort(byId)).toStrictEqual(
      DEFAULT_ROLES.map(({ id, name, grantsAll, color, permissions }) => ({
        id,
        name,
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

  it('refuses an unknown color', async () => {
    await expect(
      database.db.execute(
        sql`insert into roles (id, name, color) values (${uuidv7()}, 'Y', '#f00')`,
      ),
    ).rejects.toThrow();
  });

  it('keeps a single system role', async () => {
    await expect(
      database.db.insert(roles).values({ name: 'Second system role', grantsAll: true }),
    ).rejects.toThrow();
  });

  it('refuses to delete a role a member still holds, even a deactivated one', async () => {
    await database.db.insert(users).values({
      name: 'Grace',
      email: `grace-${uuidv7()}@example.com`,
      instanceRoleId: DEFAULT_ROLE_IDS.requester,
      deactivatedAt: new Date(),
    });

    await expect(
      database.db.delete(roles).where(eq(roles.id, DEFAULT_ROLE_IDS.requester)),
    ).rejects.toThrow();
  });

  it('refuses to delete a role a pending invitation still gives', async () => {
    const [role] = await database.db
      .insert(roles)
      .values({ name: `Invited ${uuidv7()}` })
      .returning({ id: roles.id });
    const roleId = role?.id ?? '';
    await database.db.insert(invitations).values({
      email: `pending-${uuidv7()}@example.com`,
      roleId,
      tokenHash: uuidv7(),
      invitedById: await createInviter(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(database.db.delete(roles).where(eq(roles.id, roleId))).rejects.toThrow();
  });

  it('deletes a role left only in history, clearing it there', async () => {
    const [role] = await database.db
      .insert(roles)
      .values({ name: `Former ${uuidv7()}` })
      .returning({ id: roles.id });
    const roleId = role?.id ?? '';
    const [deleted] = await database.db
      .insert(users)
      .values({
        name: '',
        email: `deleted-${uuidv7()}@deleted.invalid`,
        instanceRoleId: roleId,
        deactivatedAt: new Date(),
        deletedAt: new Date(),
      })
      .returning({ id: users.id });
    const [accepted] = await database.db
      .insert(invitations)
      .values({
        email: `accepted-${uuidv7()}@example.com`,
        roleId,
        tokenHash: uuidv7(),
        invitedById: await createInviter(),
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: new Date(),
      })
      .returning({ id: invitations.id });

    await database.db.delete(roles).where(eq(roles.id, roleId));

    const [user] = await database.db
      .select({ roleId: users.instanceRoleId })
      .from(users)
      .where(eq(users.id, deleted?.id ?? ''));
    const [invitation] = await database.db
      .select({ roleId: invitations.roleId })
      .from(invitations)
      .where(eq(invitations.id, accepted?.id ?? ''));
    expect(user?.roleId).toBeNull();
    expect(invitation?.roleId).toBeNull();
  });

  it('refuses a pending invitation without a role', async () => {
    await expect(
      database.db.insert(invitations).values({
        email: `nobody-${uuidv7()}@example.com`,
        tokenHash: uuidv7(),
        invitedById: await createInviter(),
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow();
  });

  async function createInviter(): Promise<string> {
    const [user] = await database.db
      .insert(users)
      .values({
        name: 'Inviter',
        email: `inviter-${uuidv7()}@example.com`,
        instanceRoleId: DEFAULT_ROLE_IDS.administrator,
      })
      .returning({ id: users.id });
    return user?.id ?? '';
  }

  it('keeps one pending invitation per address, and expiries after creation', async () => {
    const [inviter] = await database.db
      .insert(users)
      .values({
        name: 'Inviter',
        email: `inviter-${uuidv7()}@example.com`,
        instanceRoleId: DEFAULT_ROLE_IDS.administrator,
      })
      .returning({ id: users.id });
    const invitation = (tokenHash: string, acceptedAt: Date | null = null) => ({
      email: 'invited@example.com',
      roleId: DEFAULT_ROLE_IDS.team,
      tokenHash,
      invitedById: inviter?.id ?? '',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt,
    });

    await database.db.insert(invitations).values(invitation('accepted', new Date()));
    await database.db.insert(invitations).values(invitation('pending'));
    await expect(database.db.insert(invitations).values(invitation('second'))).rejects.toThrow();
    await expect(
      database.db
        .insert(invitations)
        .values({ ...invitation('past'), email: 'past@example.com', expiresAt: new Date(0) }),
    ).rejects.toThrow();
  });

  it('lets a deleted account be only a deactivated one', async () => {
    await expect(
      database.db.insert(users).values({
        name: '',
        email: `deleted-${uuidv7()}@deleted.invalid`,
        instanceRoleId: DEFAULT_ROLE_IDS.team,
        deletedAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});
