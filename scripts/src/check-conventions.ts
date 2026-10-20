/**
 * Enforces project conventions that the linter cannot express. Run by `npm run check:conventions`
 * and in CI. See CLAUDE.md for the reasoning behind each rule.
 */
import { checkFile } from './conventions/rules.ts';
import { formatViolation, listRepositoryFiles, readRepositoryFile } from './repository.ts';

const violations = listRepositoryFiles().flatMap((path) =>
  /\.(ts|tsx)$/.test(path) ? checkFile(path, readRepositoryFile(path)) : [],
);

if (violations.length > 0) {
  console.error(`${violations.length} convention violation(s):\n`);
  for (const violation of violations) {
    console.error(`  ${formatViolation(violation)}`);
  }
  process.exit(1);
}

console.log('Conventions: OK');
