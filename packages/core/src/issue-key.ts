import { type ProjectKey, projectKeySchema } from '@ticko/shared';

export interface IssueKeyParts {
  projectKey: ProjectKey;
  number: number;
}

const ISSUE_KEY_PATTERN = /^([^-]+)-([1-9]\d*)$/;

/** Builds the human-facing key of an issue, e.g. `WEB-42`. */
export function formatIssueKey({ projectKey, number }: IssueKeyParts): string {
  if (!(Number.isSafeInteger(number) && number > 0)) {
    throw new RangeError(`Issue number must be a positive integer, received ${number}`);
  }
  return `${projectKey}-${number}`;
}

/**
 * Parses user input such as `web-42` or ` WEB-42 ` into its parts.
 * Returns `null` for anything that is not a valid issue key, so callers can fall back to full-text search.
 */
export function parseIssueKey(input: string): IssueKeyParts | null {
  const match = ISSUE_KEY_PATTERN.exec(input.trim().toUpperCase());
  if (!match) {
    return null;
  }
  const [, rawKey = '', rawNumber = ''] = match;
  const projectKey = projectKeySchema.safeParse(rawKey);
  const number = Number(rawNumber);
  if (!(projectKey.success && Number.isSafeInteger(number))) {
    return null;
  }
  return { projectKey: projectKey.data, number };
}
