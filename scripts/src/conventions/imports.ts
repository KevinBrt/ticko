import { posix } from 'node:path';

export interface RelativeImport {
  line: number;
  /** Repository path the import points to, e.g. `apps/web/src/shared/i18n/i18n.types.ts`. */
  target: string;
}

const RELATIVE_IMPORT = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** Every `./` or `../` import of a file, resolved against the file's own directory. */
export function relativeImports(path: string, source: string): RelativeImport[] {
  return source.split('\n').flatMap((text, index) =>
    Array.from(text.matchAll(RELATIVE_IMPORT), (match) => ({
      line: index + 1,
      target: posix.normalize(posix.join(posix.dirname(path), match[1] ?? '')),
    })),
  );
}
