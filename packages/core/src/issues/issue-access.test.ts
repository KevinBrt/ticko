import { describe, expect, it } from 'vitest';
import { canSeeIssue, issueActionsOf, issueVisibilityOf } from './issue-access.ts';

describe('issue visibility', () => {
  it('shows every issue, those one reported, or none', () => {
    expect(issueVisibilityOf(['issue.read', 'issue.read.own'])).toBe('all');
    expect(issueVisibilityOf(['issue.read.own', 'issue.create'])).toBe('own');
    expect(issueVisibilityOf(['issue.create'])).toBe('none');
  });

  it('lets one see an issue of someone else only with issue.read', () => {
    expect(canSeeIssue(['issue.read'], false)).toBe(true);
    expect(canSeeIssue(['issue.read.own'], true)).toBe(true);
    expect(canSeeIssue(['issue.read.own'], false)).toBe(false);
    expect(canSeeIssue([], true)).toBe(false);
  });
});

describe('issueActionsOf', () => {
  it('gives every action to whoever holds every permission', () => {
    expect(issueActionsOf(['issue.update', 'issue.assign', 'issue.delete'], false)).toStrictEqual([
      'editText',
      'editFields',
      'changeStatus',
      'assign',
      'delete',
    ]);
  });

  it('lets a reporter fix the words of their issue, nothing more', () => {
    expect(issueActionsOf(['issue.read.own', 'issue.create'], true)).toStrictEqual(['editText']);
    expect(issueActionsOf(['issue.read'], false)).toStrictEqual([]);
  });
});
