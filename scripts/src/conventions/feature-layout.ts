/**
 * Folders of a feature and the kinds of file each holds. `''` is the feature root.
 * Every kind has exactly one home, so nothing piles up at the root.
 */
export type FeatureLayout = Readonly<Record<string, readonly string[]>>;

/** Subfolders allowed inside a kind folder to group files: `components/forms/settings/x.tsx`. */
export const MAX_GROUPING_DEPTH = 2;

/**
 * Whether a file of `kind` may sit at `parts` (its path inside the feature folder, e.g.
 * `['components', 'forms', 'login-form.tsx']`). Returns the reason when it may not.
 */
export function featureLayoutProblem(
  layout: FeatureLayout,
  parts: readonly string[],
  kind: string,
): string | null {
  const folder = parts.length > 1 ? (parts[0] ?? '') : '';
  const home = Object.entries(layout).find(([, kinds]) => kinds.includes(kind))?.[0];
  if (home === undefined) {
    return `A feature only holds ${describe(layout)}`;
  }
  if (folder !== home) {
    return home === ''
      ? `${kind} files live at the root of the feature`
      : `${kind} files live in the ${home}/ folder of the feature`;
  }
  const grouping = parts.length - 2;
  return grouping > MAX_GROUPING_DEPTH
    ? `Group files at most ${MAX_GROUPING_DEPTH} folders deep inside ${home}/`
    : null;
}

function describe(layout: FeatureLayout): string {
  return Object.entries(layout)
    .map(([folder, kinds]) => {
      const files = kinds
        .map((kind) => (kind === 'component' ? '*.tsx' : `*.${kind}.ts`))
        .join(', ');
      return folder === '' ? `${files} at its root` : `${folder}/ (${files})`;
    })
    .join(', ');
}
