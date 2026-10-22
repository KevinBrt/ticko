import { containsText, matchesWords, schema, wordsRank } from '@toppo/db';
import { or, type SQL } from 'drizzle-orm';

const { issues } = schema;

/**
 * Issues whose text a search finds: words of their title or description starting with the words
 * typed, or their title containing what was typed, even inside a word or a path (`/api/login`).
 */
export function textMatching(search: string): SQL | undefined {
  return or(matchesWords(issues.searchVector, search), containsText([issues.title], search));
}

/** How well an issue's words match a search, its title weighing more than its description. */
export function textRank(search: string): SQL<number> {
  return wordsRank(issues.searchVector, search);
}
