/** The labels a change gives an issue and takes from it. */
export interface LabelsChange {
  added: string[];
  removed: string[];
}

/** What setting an issue's labels to `requested` changes, from the ones it has: `null` if nothing. */
export function labelsChange(
  current: readonly string[],
  requested: readonly string[],
): LabelsChange | null {
  const added = requested.filter((id) => !current.includes(id));
  const removed = current.filter((id) => !requested.includes(id));
  return added.length === 0 && removed.length === 0 ? null : { added, removed };
}
