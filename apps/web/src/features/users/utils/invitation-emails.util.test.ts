import { describe, expect, it } from 'vitest';
import { parseEmails } from './invitation-emails.util.ts';

describe('parseEmails', () => {
  it('reads one address per line, or separated by commas, semicolons or spaces', () => {
    expect(
      parseEmails('ada@example.com\ngrace@example.com, alan@example.com; joan@example.com'),
    ).toStrictEqual({
      emails: ['ada@example.com', 'grace@example.com', 'alan@example.com', 'joan@example.com'],
      invalid: [],
    });
  });

  it('normalizes and keeps each address once', () => {
    expect(parseEmails('Ada@Example.com ada@example.com')).toStrictEqual({
      emails: ['ada@example.com'],
      invalid: [],
    });
  });

  it('returns what is not an address as typed', () => {
    expect(parseEmails('ada@example.com, not-an-email,   ')).toStrictEqual({
      emails: ['ada@example.com'],
      invalid: ['not-an-email'],
    });
  });
});
