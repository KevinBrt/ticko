import { describe, expect, it } from 'vitest';
import { MAX_FILES_PER_FOLDER, oversizedFolders } from './folder-size.ts';

const files = (folder: string, count: number, extension = 'tsx') =>
  Array.from({ length: count }, (_, index) => `${folder}/file-${index}.${extension}`);

describe('oversizedFolders', () => {
  it('accepts folders up to the limit', () => {
    expect(
      oversizedFolders(files('apps/web/src/features/session/components', MAX_FILES_PER_FOLDER)),
    ).toStrictEqual([]);
  });

  it('asks to group a folder beyond the limit', () => {
    const violations = oversizedFolders(
      files('apps/web/src/features/session/components', MAX_FILES_PER_FOLDER + 1),
    );

    expect(violations).toStrictEqual([
      expect.objectContaining({
        file: 'apps/web/src/features/session/components/',
        message: expect.stringContaining('group them in subfolders'),
      }),
    ]);
  });

  it('does not count tests, which sit next to the files they test', () => {
    const folder = 'apps/server/src/features/issues/commands';
    const paths = [
      ...files(folder, MAX_FILES_PER_FOLDER, 'command.ts'),
      ...files(folder, MAX_FILES_PER_FOLDER, 'command.test.ts'),
    ];

    expect(oversizedFolders(paths)).toStrictEqual([]);
  });

  it('counts each folder separately and ignores files outside product code', () => {
    const paths = [
      ...files('apps/web/src/features/session/components/forms', 6),
      ...files('apps/web/src/features/session/components/account', 6),
      ...files('scripts/src/conventions', 20, 'ts'),
      ...files('apps/server/migrations', 20, 'ts'),
    ];

    expect(oversizedFolders(paths)).toStrictEqual([]);
  });
});
