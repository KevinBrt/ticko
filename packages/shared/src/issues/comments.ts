import { z } from 'zod';
import { ATTACHMENTS_MAX, issueAttachmentSchema } from './attachments.ts';
import { issueKeyParamsSchema } from './issues.ts';

/** Mirrors the `comments_body_length` check of the database. */
export const COMMENT_BODY_MAX_LENGTH = 20_000;

/** A comment's words: plain text, its line breaks kept, trimmed, never blank. */
export const commentBodySchema = z.string().trim().min(1).max(COMMENT_BODY_MAX_LENGTH);

/** Body of `POST /api/v1/issues/:issueKey/comments` and `PATCH …/comments/:commentId`. */
export const commentRequestSchema = z.object({ body: commentBodySchema });

export type CommentRequest = z.input<typeof commentRequestSchema>;

/** Answer of `POST /api/v1/issues/:issueKey/comments`: the new comment's id. */
export const addCommentResponseSchema = z.object({ id: z.uuid() });

/** The path of one comment: `/api/v1/issues/WEB-42/comments/:commentId`. */
export const commentParamsSchema = issueKeyParamsSchema.extend({ commentId: z.uuid() });

/** What someone may do on a comment: its author edits it; its author or a moderator deletes it. */
export const COMMENT_ACTIONS = ['edit', 'delete'] as const;

export type CommentAction = (typeof COMMENT_ACTIONS)[number];

/** A comment as the history shows it: as it is now, its files with it, with what the reader may do on it. */
export const issueCommentSchema = z.object({
  id: z.uuid(),
  /** Plain text, as written. */
  body: z.string(),
  /** UTC ISO 8601 date its author last changed it, or `null`. */
  editedAt: z.iso.datetime().nullable(),
  /** Oldest first. */
  attachments: z.array(issueAttachmentSchema).max(ATTACHMENTS_MAX),
  actions: z.array(z.enum(COMMENT_ACTIONS)),
});

export type IssueComment = z.infer<typeof issueCommentSchema>;
