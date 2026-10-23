import { describe, expect, it } from 'vitest';
import { type AttachmentPlace, attachmentActionsOf, canAttachTo } from './attachment-access.ts';

const REQUESTER = ['issue.read.own', 'issue.create', 'comment.create'];
const TEAM = ['issue.read', 'issue.create', 'issue.update', 'comment.create'];
const READER = ['issue.read'];
const MODERATOR = ['issue.read', 'comment.moderate'];

const ownRequest: AttachmentPlace = { on: 'request', reportedByThem: true };
const otherRequest: AttachmentPlace = { on: 'request', reportedByThem: false };
const ownComment: AttachmentPlace = { on: 'comment', writtenByThem: true };
const otherComment: AttachmentPlace = { on: 'comment', writtenByThem: false };

describe('canAttachTo', () => {
  it('lets the reporter, or whoever edits the issue, attach files to its request', () => {
    expect(canAttachTo(REQUESTER, ownRequest)).toBe(true);
    expect(canAttachTo(TEAM, otherRequest)).toBe(true);
    expect(canAttachTo(READER, otherRequest)).toBe(false);
    expect(canAttachTo(MODERATOR, otherRequest)).toBe(false);
  });

  it('lets the author of a comment attach files to it while they may comment', () => {
    expect(canAttachTo(REQUESTER, ownComment)).toBe(true);
    expect(canAttachTo(READER, ownComment)).toBe(false);
    expect(canAttachTo(TEAM, otherComment)).toBe(false);
    expect(canAttachTo(MODERATOR, otherComment)).toBe(false);
  });
});

describe('attachmentActionsOf', () => {
  it('lets whoever edits the issue remove any file of its request', () => {
    expect(attachmentActionsOf(TEAM, otherRequest, false)).toStrictEqual(['delete']);
  });

  it('lets an uploader remove their file while they may still attach files there', () => {
    expect(attachmentActionsOf(REQUESTER, ownRequest, true)).toStrictEqual(['delete']);
    // Attached while they could edit the issue, which they no longer can.
    expect(attachmentActionsOf(READER, otherRequest, true)).toStrictEqual([]);
  });

  it('leaves the files of others alone otherwise, even for the reporter', () => {
    expect(attachmentActionsOf(REQUESTER, ownRequest, false)).toStrictEqual([]);
    expect(attachmentActionsOf(MODERATOR, otherRequest, false)).toStrictEqual([]);
  });

  it('lets whoever may delete a comment remove its files: its author, a moderator', () => {
    expect(attachmentActionsOf(REQUESTER, ownComment, true)).toStrictEqual(['delete']);
    expect(attachmentActionsOf(MODERATOR, otherComment, false)).toStrictEqual(['delete']);
    expect(attachmentActionsOf(TEAM, otherComment, false)).toStrictEqual([]);
    expect(attachmentActionsOf(READER, ownComment, true)).toStrictEqual([]);
  });
});
