import { z } from 'zod';
import { roleBadgeSchema } from '../members/roles.ts';
import { projectKeySchema } from '../project-key.ts';

/** Rows per page of a project's members. */
export const PROJECT_MEMBERS_PAGE_SIZE = 50;

/** How many people one request adds to a project. */
export const PROJECT_MEMBERS_PER_REQUEST_MAX = 50;

/** How many matches a search for people or projects to add answers. */
export const PICKER_RESULTS_MAX = 20;

export const projectMemberParamsSchema = z.object({
  projectKey: projectKeySchema,
  userId: z.uuid(),
});

/** Query of `GET /api/v1/projects/:projectKey/members`. */
export const projectMembersQuerySchema = z.object({
  /** Part of a name or an address, case and accents ignored. */
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export interface ProjectMembersQuery {
  search?: string | undefined;
  page?: number | undefined;
}

export const projectMemberSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  email: z.string(),
  /** The member's own role. */
  ownRole: roleBadgeSchema,
  /** The role the project gives them instead, if any. */
  projectRole: roleBadgeSchema.nullable(),
  /** UTC ISO 8601 date of deactivation, or `null` while the account is active. */
  deactivatedAt: z.iso.datetime().nullable(),
});

export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const projectMembersResponseSchema = z.object({
  /** One page, by name. */
  rows: z.array(projectMemberSchema),
  matching: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type ProjectMembersResponse = z.infer<typeof projectMembersResponseSchema>;

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

/** People who could join a project: active members of the instance not in it yet. */
export const projectCandidatesResponseSchema = z.object({
  people: z.array(z.object({ id: z.uuid(), name: z.string(), email: z.string() })),
});

export type ProjectCandidatesResponse = z.infer<typeof projectCandidatesResponseSchema>;
