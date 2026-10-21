import { PROJECT_KEY_MAX_LENGTH, type ProjectKey, projectKeySchema } from '@toppo/shared';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatIssueKey, parseIssueKey } from './issue-key.ts';

const key = (value: string): ProjectKey => projectKeySchema.parse(value);

const projectKeyArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    fc.string({
      unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
      minLength: 1,
      maxLength: PROJECT_KEY_MAX_LENGTH - 1,
    }),
  )
  .map(([first, rest]) => key(first + rest));

describe('formatIssueKey', () => {
  it('joins the project key and the number', () => {
    expect(formatIssueKey({ projectKey: key('WEB'), number: 42 })).toBe('WEB-42');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('rejects number %s', (number) => {
    expect(() => formatIssueKey({ projectKey: key('WEB'), number })).toThrow(RangeError);
  });
});

describe('parseIssueKey', () => {
  it.each([
    ['WEB-42', 'WEB', 42],
    ['web-42', 'WEB', 42],
    ['  API2-7 ', 'API2', 7],
  ])('parses %j', (input, projectKey, number) => {
    expect(parseIssueKey(input)).toStrictEqual({ projectKey, number });
  });

  it.each([
    '',
    'WEB',
    'WEB-',
    'WEB-0',
    'WEB-042',
    'WEB-1.5',
    'WEB--1',
    '-42',
    '1WEB-42',
    'WEB-42-1',
    'W-42',
    'WEB-99999999999999999999',
  ])('returns null for %j', (input) => {
    expect(parseIssueKey(input)).toBeNull();
  });

  it('round-trips any valid key and number', () => {
    fc.assert(
      fc.property(
        projectKeyArbitrary,
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        (projectKey, number) => {
          expect(parseIssueKey(formatIssueKey({ projectKey, number }))).toStrictEqual({
            projectKey,
            number,
          });
        },
      ),
    );
  });

  it('never throws, whatever the input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => parseIssueKey(input)).not.toThrow();
      }),
    );
  });
});
