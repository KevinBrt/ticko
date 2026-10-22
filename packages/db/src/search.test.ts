import { DEFAULT_ROLE_IDS } from '@toppo/core';
import { createTestDatabase } from '@toppo/testing';
import { desc, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from './database.ts';
import { users } from './schema/index.ts';
import { containsText, escapeLike, matchesWords, wordsRank } from './search.ts';
import { uuidv7 } from './uuid.ts';

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
  database = createDatabase({ url: (await createTestDatabase()).url, maxConnections: 2 });
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

/** The words of a person, as issues keep theirs: the name weighs more than the email. */
const personWords = sql`setweight(to_tsvector('simple', fold_text(${users.name})), 'A') || setweight(to_tsvector('simple', fold_text(${users.email})), 'B')`;

async function namesWithWords(term: string): Promise<string[]> {
  const rows = await database.db
    .select({ name: users.name })
    .from(users)
    .where(matchesWords(personWords, term))
    .orderBy(desc(wordsRank(personWords, term)));
  return rows.map(({ name }) => name);
}

describe('matchesWords', () => {
  it('finds words by their start, ignoring case and accents', async () => {
    expect(await namesWithWords('ELO')).toStrictEqual(['Éloïse Martin']);
    expect(await namesWithWords('mart éloï')).toStrictEqual(['Éloïse Martin']);
  });

  it('needs every word typed', async () => {
    expect(await namesWithWords('sale off')).toStrictEqual(['Sale 50% off']);
    expect(await namesWithWords('sale martin')).toStrictEqual([]);
  });

  it('reads only letters and digits, never full-text syntax', async () => {
    expect(await namesWithWords("50%! & | :* ' off")).toStrictEqual(['Sale 50% off']);
    expect(matchesWords(personWords, ' %& ')).toBeUndefined();
  });

  it('ranks the heavier words first', async () => {
    await database.db.insert(users).values({
      id: uuidv7(),
      name: 'Person Zero',
      email: 'zero@example.com',
      instanceRoleId: DEFAULT_ROLE_IDS.team,
    });

    const [named, ...emailed] = await namesWithWords('person');

    expect(named).toBe('Person Zero');
    expect(emailed.toSorted()).toStrictEqual(NAMES.toSorted());
  });
});
