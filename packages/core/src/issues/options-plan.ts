/** What saving a whole list of options does to the stored ones. */
export interface OptionsPlan<Fields> {
  /** Stored options to delete. */
  removed: string[];
  /** Stored options the list keeps, with what they become and their new place. */
  kept: (Fields & { id: string; position: number })[];
  /** Options the list adds, in their place. */
  added: (Fields & { position: number })[];
}

/**
 * How saving `requested`, the whole list in its new order, and deleting `removed` change the
 * stored options; `null` when the list was made from options that changed meanwhile: one it
 * keeps was deleted (it would come back), or one was added that it neither keeps nor removes.
 */
export function planOptions<Draft extends { id?: string | undefined }>(
  storedIds: readonly string[],
  requested: readonly Draft[],
  removed: readonly string[],
): OptionsPlan<Omit<Draft, 'id'>> | null {
  const stored = new Set(storedIds);
  const kept: OptionsPlan<Omit<Draft, 'id'>>['kept'] = [];
  const added: OptionsPlan<Omit<Draft, 'id'>>['added'] = [];
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
