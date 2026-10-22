import { addCommentResponseSchema } from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';

/** Commands answer `204 No Content`. */
const noContent = z.null();

const commentsPath = (issueKey: string) =>
  `/api/v1/issues/${encodeURIComponent(issueKey)}/comments`;

/** Server calls about the comments of an issue; they are read in its history. */
export const Comments = {
  /** Comments on an issue; answers the new comment's id. */
  async add(issueKey: string, body: string): Promise<string> {
    return (
      await apiRequest(commentsPath(issueKey), {
        method: 'POST',
        body: { body },
        schema: addCommentResponseSchema,
      })
    ).id;
  },

  /** Changes the words of one's own comment. */
  async edit(issueKey: string, commentId: string, body: string): Promise<void> {
    await apiRequest(`${commentsPath(issueKey)}/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      body: { body },
      schema: noContent,
    });
  },

  /** Deletes a comment for good: one's own, or any for a moderator. */
  async remove(issueKey: string, commentId: string): Promise<void> {
    await apiRequest(`${commentsPath(issueKey)}/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      schema: noContent,
    });
  },
};
