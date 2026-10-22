import type { CategoryDraft } from '@toppo/shared';

type Fields = Omit<CategoryDraft, 'id'>;

/** What saving a list of categories does to the stored ones. */
export interface CategoriesPlan {
  /** Stored categories to delete, once no issue has them. */
  removed: string[];
  /** Stored categories the list keeps, with what they become and their new place. */
  kept: (Fields & { id: string; position: number })[];
  /** Categories the list adds, in their place. */
  added: (Fields & { position: number })[];
}

/**
 * How saving `requested`, the whole list in its new order, and deleting `removed` change the
 * stored categories; `null` when the list was made from categories that changed meanwhile: one it
 * keeps was deleted (it would come back), or one was added that it neither keeps nor removes.
 */
export function planCategories(
  storedIds: readonly string[],
  requested: readonly CategoryDraft[],
  removed: readonly string[],
): CategoriesPlan | null {
  const stored = new Set(storedIds);
  const kept: CategoriesPlan['kept'] = [];
  const added: CategoriesPlan['added'] = [];
  for (const [position, { id, ...fields }] of requested.entries()) {
    if (id === undefined) {
      added.push({ ...fields, position });
    } else if (stored.has(id)) {
      kept.push({ ...fields, id, position });
    } else {
      return null;
    }
  }
  const accounted = new Set([...kept.map(({ id }) => id), ...removed]);
  if (storedIds.some((id) => !accounted.has(id))) {
    return null;
  }
  // One removed meanwhile by someone else is gone already: nothing left to do.
  return { removed: removed.filter((id) => stored.has(id)), kept, added };
}
