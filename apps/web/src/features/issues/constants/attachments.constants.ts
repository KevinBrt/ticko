/** The largest text file shown in the app, in bytes: a larger one is downloaded. */
export const TEXT_SHOWN_MAX_SIZE = 1024 * 1024;

/** What the server may refuse about a file, as the reader is told it. */
export const ATTACHMENT_ERRORS = {
  ATTACHMENT_TYPE_NOT_ALLOWED: 'issues.attachments.errors.typeNotAllowed',
  ATTACHMENT_CONTENT_MISMATCH: 'issues.attachments.errors.contentMismatch',
  ATTACHMENT_TOO_LARGE: 'issues.attachments.errors.tooLarge',
  ATTACHMENT_EMPTY: 'issues.attachments.errors.empty',
  TOO_MANY_ATTACHMENTS: 'issues.attachments.errors.tooMany',
  STORAGE_FULL: 'issues.attachments.errors.storageFull',
  INVALID_FILE_NAME: 'issues.attachments.errors.invalidName',
  UPLOAD_INCOMPLETE: 'issues.attachments.errors.incomplete',
  ATTACHMENT_NOT_FOUND: 'issues.attachments.errors.notFound',
  COMMENT_NOT_FOUND: 'issues.comments.notFound',
  PROJECT_ARCHIVED: 'projects.archivedNotice',
} as const;
