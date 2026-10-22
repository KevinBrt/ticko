import { or, type SQL, type SQLWrapper, sql } from 'drizzle-orm';

/**
 * At most this many words of a search count: enough for any title, and the full-text query
 * stays small whatever is typed.
 */
const SEARCH_WORDS_MAX = 10;

/**
 * "Éloïse" → "eloise", on both sides of a comparison: `fold_text()`, defined by the migrations
 * (`0023_search_folding`) so that indexes use the very same folding.
 */
function folded(value: SQLWrapper | string): SQL {
  return sql`fold_text(${value})`;
}

/** So that searching "50%" or "a_b" matches those very characters. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Rows where one of `columns` contains `term`, ignoring case and accents. The term travels as
 * a bound parameter with its `LIKE` wildcards escaped: what users type is never a pattern.
 */
export function containsText(columns: readonly SQLWrapper[], term: string): SQL | undefined {
  const pattern = folded(`%${escapeLike(term)}%`);
  return or(...columns.map((column) => sql`${folded(column)} like ${pattern}`));
}

/**
 * The full-text query of `term`: each of its words as the start of a word, all of them needed.
 * Only letters and digits reach it, so what users type is never full-text syntax.
 */
function prefixQuery(term: string): SQL | undefined {
  const words = term
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
    .slice(0, SEARCH_WORDS_MAX);
  if (words.length === 0) {
    return undefined;
  }
  return sql`to_tsquery('simple', ${folded(words.map((word) => `${word}:*`).join(' & '))})`;
}

/**
 * Rows whose `vector`, a `tsvector` of text folded by `fold_text()`, has a word starting with
 * each word of `term`: "crash sav" finds "Crash on save". No condition when `term` has no word.
 */
export function matchesWords(vector: SQLWrapper, term: string): SQL | undefined {
  const query = prefixQuery(term);
  return query ? sql`${vector} @@ ${query}` : undefined;
}

/** How well `vector` matches the words of `term`, higher for heavier words; 0 without words. */
export function wordsRank(vector: SQLWrapper, term: string): SQL<number> {
  const query = prefixQuery(term);
  return query ? sql<number>`ts_rank(${vector}, ${query})` : sql<number>`0`;
}
