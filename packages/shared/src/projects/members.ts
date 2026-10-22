import { z } from 'zod';
import { roleBadgeSchema } from '../members/roles.ts';
import { projectKeySchema } from '../project-key.ts';

/** Rows per page of a project's access list. */
export const PROJECT_ACCESS_PAGE_SIZE = 50;

/** How many people one request adds to a project. */
export const PROJECT_MEMBERS_PER_REQUEST_MAX = 50;

/** How many matches a search for people or projects to add answers. */
export const PICKER_RESULTS_MAX = 20;

export const projectMemberParamsSchema = z.object({
  projectKey: projectKeySchema,
  userId: z.uuid(),
});

export const projectInvitationParamsSchema = z.object({
  projectKey: projectKeySchema,
  invitationId: z.uuid(),
});

/** Query of `GET /api/v1/projects/:projectKey/access`. */
export const projectAccessQuerySchema = z.object({
  /** Part of a name or an address, case and accents ignored. */
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export interface ProjectAccessQuery {
  search?: string | undefined;
  page?: number | undefined;
}

/** Why someone reaches a project. */
export const PROJECT_ACCESS_REASONS = ['systemRole', 'allProjects', 'member'] as const;

export type ProjectAccessReason = (typeof PROJECT_ACCESS_REASONS)[number];

const personAccessSchema = z.object({
  kind: z.literal('person'),
  userId: z.uuid(),
  name: z.string(),
  email: z.string(),
  /** Added to the project, or reaching it anyway: those are not removed from it. */
  access: z.enum(PROJECT_ACCESS_REASONS),
  /** The member's own role. */
  ownRole: roleBadgeSchema,
  /** The role the project gives them instead, if any. */
  projectRole: roleBadgeSchema.nullable(),
  /** UTC ISO 8601 date of deactivation, or `null` while the account is active. */
  deactivatedAt: z.iso.datetime().nullable(),
});

const invitationAccessSchema = z.object({
  kind: z.literal('invitation'),
  invitationId: z.uuid(),
  email: z.string(),
  role: roleBadgeSchema,
  /** The invitation gives every project: it is not taken out of this one. */
  allProjects: z.boolean(),
  /** UTC ISO 8601. */
  expiresAt: z.iso.datetime(),
});

/** Someone who has access to a project, or will once their invitation is accepted. */
export const projectAccessRowSchema = z.discriminatedUnion('kind', [
  personAccessSchema,
  invitationAccessSchema,
]);

export type ProjectAccessRow = z.infer<typeof projectAccessRowSchema>;

export const projectAccessResponseSchema = z.object({
  /** One page: automatic access first, then the members, then pending invitations, by name. */
  rows: z.array(projectAccessRowSchema),
  matching: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type ProjectAccessResponse = z.infer<typeof projectAccessResponseSchema>;

/** Body of `POST /api/v1/projects/:projectKey/members`: who joins, and with which role there. */
export const addProjectMembersRequestSchema = z.object({
  userIds: z
    .array(z.uuid())
    .min(1)
    .max(PROJECT_MEMBERS_PER_REQUEST_MAX)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Each person at most once' }),
  /** `null`: their own role applies in the project. */
  roleId: z.uuid().nullable(),
});

export type AddProjectMembersRequest = z.infer<typeof addProjectMembersRequestSchema>;

/** Body of `PATCH /api/v1/projects/:projectKey/members/:userId`. */
export const changeProjectMemberRoleRequestSchema = z.object({
  /** `null`: their own role applies in the project again. */
  roleId: z.uuid().nullable(),
});

/** Query of the searches that pick people or projects. */
export const pickerQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

/**
 * People who could join a project: active members of the instance who do not reach it yet. Those
 * who reach every project are never offered.
 */
export const projectCandidatesResponseSchema = z.object({
  people: z.array(z.object({ id: z.uuid(), name: z.string(), email: z.string() })),
});

export type ProjectCandidatesResponse = z.infer<typeof projectCandidatesResponseSchema>;
