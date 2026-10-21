import { or, type SQL, type SQLWrapper, sql } from 'drizzle-orm';

/**
 * Accented letters and their base letter, position by position. Folded before `lower()`, so the
 * search ignores accents even on a database whose collation lowers ASCII only.
 */
const ACCENTED = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ';
const PLAIN = 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';

/** "Éloïse" → "eloise", on both sides of a comparison. */
function folded(value: SQLWrapper | string): SQL {
  return sql`lower(translate(${value}, ${ACCENTED}, ${PLAIN}))`;
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
