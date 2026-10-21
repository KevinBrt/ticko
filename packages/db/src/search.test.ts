import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { createTestDatabase, type TestDatabase } from '@toppo/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './database.ts';
import { users } from './schema/index.ts';
import { containsText, escapeLike } from './search.ts';
import { uuidv7 } from './uuid.ts';

let testDatabase: TestDatabase;
let database: Database;

const NAMES = [
  'Éloïse Martin',
  'àáâãäå ç èéêë ìíîï ñ òóôõö ùúûü ýÿ ÀÁÂÃÄÅ Ç ÈÉÊË ÌÍÎÏ Ñ ÒÓÔÕÖ ÙÚÛÜ Ý',
  'Sale 50% off',
  'Under_score',
  'Back\\slash',
];

async function namesMatching(term: string): Promise<string[]> {
  const rows = await database.db
    .select({ name: users.name })
    .from(users)
    .where(containsText([users.name, users.email], term));
  return rows.map(({ name }) => name).sort();
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  database = createDatabase({ url: testDatabase.url, maxConnections: 2 });
  await database.db.insert(users).values(
    NAMES.map((name, index) => ({
      id: uuidv7(),
      name,
      email: `person${index}@example.com`,
      instanceRoleId: DEFAULT_ROLE_IDS.team,
    })),
  );
});

afterAll(async () => {
  await database.close();
  await testDatabase.drop();
});

describe('containsText', () => {
  it('ignores case and accents, on both sides', async () => {
    expect(await namesMatching('eloise')).toStrictEqual(['Éloïse Martin']);
    expect(await namesMatching('ÉLOÏSE')).toStrictEqual(['Éloïse Martin']);
  });

  it('folds every accented letter it knows to its base letter', async () => {
    expect(
      await namesMatching('aaaaaa c eeee iiii n ooooo uuuu yy aaaaaa c eeee iiii n ooooo uuuu y'),
    ).toHaveLength(1);
  });

  it('searches every column given', async () => {
    expect(await namesMatching('person0@')).toStrictEqual(['Éloïse Martin']);
  });

  it('treats LIKE wildcards as plain characters', async () => {
    expect(await namesMatching('50%')).toStrictEqual(['Sale 50% off']);
    expect(await namesMatching('%')).toStrictEqual(['Sale 50% off']);
    // As a wildcard, _ would find "Sale".
    expect(await namesMatching('sa_e')).toStrictEqual([]);
    expect(await namesMatching('_')).toStrictEqual(['Under_score']);
    expect(await namesMatching('\\')).toStrictEqual(['Back\\slash']);
  });
});

describe('escapeLike', () => {
  it('escapes the backslash, then the wildcards', () => {
    expect(escapeLike('a\\b%c_d')).toBe('a\\\\b\\%c\\_d');
  });
});
