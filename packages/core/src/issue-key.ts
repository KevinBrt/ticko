import { type ProjectKey, projectKeySchema } from '@toppo/shared';

export interface IssueKeyParts {
  projectKey: ProjectKey;
  number: number;
}

const ISSUE_KEY_PATTERN = /^([^-]+)-([1-9]\d*)$/;

/** A number alone, `42` or `#42`, up to nine digits like the keys `issueKeySchema` accepts. */
const ISSUE_NUMBER_PATTERN = /^#?([1-9]\d{0,8})$/;

const ISSUE_NUMBER_MAX = 999_999_999;

/** An issue a search names: by its key, or by its number alone in the project at hand. */
export interface IssueReference {
  projectKey: ProjectKey | null;
  number: number;
}

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

/**
 * The issue a search names, if it names one: `WEB-42` in any case, or `42` and `#42`, which mean
 * that number in whichever project is searched (`projectKey` null). Numbers no issue can carry
 * name nothing.
 */
export function issueReferenceIn(search: string): IssueReference | null {
  const key = parseIssueKey(search);
  if (key) {
    return key.number <= ISSUE_NUMBER_MAX ? key : null;
  }
  const match = ISSUE_NUMBER_PATTERN.exec(search.trim());
  return match ? { projectKey: null, number: Number(match[1]) } : null;
}
