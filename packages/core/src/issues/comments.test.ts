import { describe, expect, it } from 'vitest';
import { commentActionsOf } from './comments.ts';

describe('commentActionsOf', () => {
  it('lets the author edit and delete their comment while they may comment', () => {
    expect(commentActionsOf(['comment.create'], true)).toStrictEqual(['edit', 'delete']);
    expect(commentActionsOf(['issue.read'], true)).toStrictEqual([]);
  });

  it('lets a moderator delete any comment, never edit one of someone else', () => {
    expect(commentActionsOf(['comment.create', 'comment.moderate'], false)).toStrictEqual([
      'delete',
    ]);
    expect(commentActionsOf(['comment.moderate'], true)).toStrictEqual(['delete']);
  });

  it('leaves the comments of others alone otherwise', () => {
    expect(commentActionsOf(['comment.create', 'issue.update'], false)).toStrictEqual([]);
  });
});
