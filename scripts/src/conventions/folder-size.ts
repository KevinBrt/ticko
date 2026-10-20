import { posix } from 'node:path';
import type { Violation } from '../repository.ts';

/** Beyond this, a folder is a dumping ground: its files must be grouped in subfolders. */
export const MAX_FILES_PER_FOLDER = 10;

const PRODUCT_SOURCE = /^(apps|packages|plugins)\/[^/]+\/src\/.+\.tsx?$/;
const TEST = /\.(test|spec)\.tsx?$|test-helpers\.tsx?$|test-setup\.ts$/;

/** Folders of product code holding more than the allowed number of source files (tests aside). */
export function oversizedFolders(paths: readonly string[]): Violation[] {
  const counts = new Map<string, number>();
  for (const path of paths) {
    if (PRODUCT_SOURCE.test(path) && !TEST.test(path)) {
      const folder = posix.dirname(path);
      counts.set(folder, (counts.get(folder) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, count]) => count > MAX_FILES_PER_FOLDER)
    .map(([folder, count]) => ({
      rule: 'folder-size',
      file: `${folder}/`,
      line: 1,
      message: `${count} files in one folder: group them in subfolders (at most ${MAX_FILES_PER_FOLDER})`,
    }));
}
