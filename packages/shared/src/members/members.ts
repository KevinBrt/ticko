import { z } from 'zod';
import { pendingInvitationSchema } from './invitations.ts';
import { userSummarySchema } from './users.ts';

/** Rows per page of the members list. */
export const MEMBERS_PAGE_SIZE = 50;

/**
 * Query of `GET /api/v1/members`. The server searches, filters, sorts and pages: the browser
 * never holds more than one page.
 */
export const membersQuerySchema = z.object({
  /** Only the rows holding this role. */
  role: z.uuid().optional(),
  /** Part of a name or an address, case and accents ignored. */
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

/** The filters a screen sends; the first page when none is given. */
export interface MembersQuery {
  role?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
}

/** A member, or someone invited who has not joined yet. */
export const memberRowSchema = z.discriminatedUnion('type', [
  userSummarySchema.extend({ type: z.literal('member') }),
  pendingInvitationSchema.extend({ type: z.literal('invitation') }),
]);

export type MemberRow = z.infer<typeof memberRowSchema>;

export const membersResponseSchema = z.object({
  /** One page, by role (in the order roles were created), then by name or address. */
  rows: z.array(memberRowSchema),
  /** Rows matching the search, by role id: the counts of the role tabs. */
  byRole: z.record(z.uuid(), z.number().int()),
  /** Rows matching the search and the role, across all pages. */
  matching: z.number().int(),
  /** The instance as a whole, whatever the filters. */
  totals: z.object({ members: z.number().int(), invitations: z.number().int() }),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type MembersResponse = z.infer<typeof membersResponseSchema>;
