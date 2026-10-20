import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Tracked and untracked-but-not-ignored files, as forward-slash paths relative to the root.
 * Files deleted in the working tree but still in the index are left out.
 */
export function listRepositoryFiles(): string[] {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  return output
    .split('\0')
    .filter((path) => path !== '' && existsSync(join(REPOSITORY_ROOT, path)));
}

export function readRepositoryFile(path: string): string {
  return readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
}

export interface Violation {
  rule: string;
  file: string;
  line: number;
  message: string;
}

export function formatViolation({ rule, file, line, message }: Violation): string {
  return `${file}:${line}  ${message}  [${rule}]`;
}
