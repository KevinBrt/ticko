import { z } from 'zod';
import { issueKeyParamsSchema } from './issues.ts';

/**
 * The types of file people may attach, as the server detects them from the content, never from
 * what the client says. Nothing a browser could run (no SVG, no HTML) and no archive, whose
 * content cannot be checked. Mirrors the `attachments_media_type_check` of the database.
 */
export const ATTACHMENT_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
] as const;

export type AttachmentMediaType = (typeof ATTACHMENT_MEDIA_TYPES)[number];

/** How a file is shown: images as a thumbnail, other files by an icon of their kind. */
export const ATTACHMENT_KINDS = [
  'image',
  'pdf',
  'text',
  'spreadsheet',
  'document',
  'presentation',
] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/**
 * For each type, the extensions a file of that type may end with (lowercase, each extension
 * naming one type) and its kind. The extension is what the person who downloads the file opens
 * it by: it must say what the content is.
 */
export const ATTACHMENT_TYPES = {
  'image/png': { extensions: ['png'], kind: 'image' },
  'image/jpeg': { extensions: ['jpg', 'jpeg'], kind: 'image' },
  'image/webp': { extensions: ['webp'], kind: 'image' },
  'application/pdf': { extensions: ['pdf'], kind: 'pdf' },
  'text/plain': { extensions: ['txt', 'log'], kind: 'text' },
  'text/csv': { extensions: ['csv'], kind: 'spreadsheet' },
  'application/msword': { extensions: ['doc'], kind: 'document' },
  'application/vnd.ms-excel': { extensions: ['xls'], kind: 'spreadsheet' },
  'application/vnd.ms-powerpoint': { extensions: ['ppt'], kind: 'presentation' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['docx'],
    kind: 'document',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['xlsx'],
    kind: 'spreadsheet',
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extensions: ['pptx'],
    kind: 'presentation',
  },
  'application/vnd.oasis.opendocument.text': { extensions: ['odt'], kind: 'document' },
  'application/vnd.oasis.opendocument.spreadsheet': { extensions: ['ods'], kind: 'spreadsheet' },
  'application/vnd.oasis.opendocument.presentation': {
    extensions: ['odp'],
    kind: 'presentation',
  },
} as const satisfies Record<
  AttachmentMediaType,
  { extensions: readonly string[]; kind: AttachmentKind }
>;

/**
 * What someone may do on a file they see, besides downloading it: remove it, for good. Its
 * uploader or whoever edits the issue removes a file of the request; the author of a comment or
 * a moderator, a file of that comment.
 */
export const ATTACHMENT_ACTIONS = ['delete'] as const;

export type AttachmentAction = (typeof ATTACHMENT_ACTIONS)[number];

/** Mirrors the `attachments_file_name_length` check of the database. */
export const ATTACHMENT_NAME_MAX_LENGTH = 255;

/**
 * The largest file an instance may accept, whatever `TOPPO_ATTACHMENT_MAX_SIZE_MB` says: 1 GiB.
 * Mirrors the `attachments_size_check` of the database.
 */
export const ATTACHMENT_SIZE_CEILING = 1024 * 1024 * 1024;

/** At most this many files on an issue's request, and on each comment: a short list, shown whole. */
export const ATTACHMENTS_MAX = 20;

/**
 * The header that names the file sent to `POST …/attachments`, percent-encoded
 * (`encodeURIComponent`) since headers are ASCII. Kept out of the URL, and so out of the logs.
 */
export const FILE_NAME_HEADER = 'x-file-name';

/** A file as an issue's request or a comment shows it, with what the reader may do on it. */
export const issueAttachmentSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  mediaType: z.enum(ATTACHMENT_MEDIA_TYPES),
  /** In bytes. */
  size: z.number().int(),
  actions: z.array(z.enum(ATTACHMENT_ACTIONS)),
});

export type IssueAttachment = z.infer<typeof issueAttachmentSchema>;

/** Answer of `GET /api/v1/issues/:issueKey/attachments`: the files of its request, oldest first. */
export const issueAttachmentsResponseSchema = z.object({
  rows: z.array(issueAttachmentSchema).max(ATTACHMENTS_MAX),
});

export type IssueAttachmentsResponse = z.infer<typeof issueAttachmentsResponseSchema>;

/** Answer of `POST …/attachments`: the new file's id. */
export const addAttachmentResponseSchema = z.object({ id: z.uuid() });

/** The path of one file of an issue: `/api/v1/issues/WEB-42/attachments/:attachmentId`. */
export const attachmentParamsSchema = issueKeyParamsSchema.extend({ attachmentId: z.uuid() });

/** Answer of `GET /api/v1/attachments/limits`: what forms check before sending a file. */
export const attachmentLimitsResponseSchema = z.object({
  /** In bytes (`TOPPO_ATTACHMENT_MAX_SIZE_MB`). */
  maxFileSize: z.number().int(),
});

export type AttachmentLimitsResponse = z.infer<typeof attachmentLimitsResponseSchema>;
