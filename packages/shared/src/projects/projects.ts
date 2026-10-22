import { z } from 'zod';
import { projectKeySchema } from '../project-key.ts';

export const PROJECT_NAME_MAX_LENGTH = 80;

export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;

/** Rows per page of the projects list. */
export const PROJECTS_PAGE_SIZE = 50;

export const projectKeyParamsSchema = z.object({
  projectKey: projectKeySchema,
});

export const projectNameSchema = z.string().trim().min(1).max(PROJECT_NAME_MAX_LENGTH);

export const projectDescriptionSchema = z.string().trim().max(PROJECT_DESCRIPTION_MAX_LENGTH);

/** Body of `POST /api/v1/projects`. */
export const createProjectRequestSchema = z.object({
  key: projectKeySchema,
  name: projectNameSchema,
  description: projectDescriptionSchema.default(''),
});

export type CreateProjectRequest = z.input<typeof createProjectRequestSchema>;

export const createProjectResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
});

/** Body of `PATCH /api/v1/projects/:projectKey`: the key changes only until the first issue. */
export const updateProjectRequestSchema = z.object({
  key: projectKeySchema,
  name: projectNameSchema,
  description: projectDescriptionSchema,
});

export type UpdateProjectRequest = z.input<typeof updateProjectRequestSchema>;

/** Body of `GET /api/v1/projects/:projectKey`: a project, as the caller may use it. */
export const projectResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  /** Read-only while archived. */
  archived: z.boolean(),
  /** The key can change until the project's first issue. */
  keyEditable: z.boolean(),
  /**
   * What the caller may do in this project, by catalog name (`@toppo/core`), so the web app can
   * hide the rest. Plain strings on the wire: the server stays the only judge.
   */
  permissions: z.array(z.string()),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;

/**
 * Query of `GET /api/v1/projects`: the projects the caller reaches. The server searches and pages;
 * archived ones are listed apart.
 */
export const projectsQuerySchema = z.object({
  state: z.enum(['active', 'archived']).default('active'),
  /** Part of a key or a name, case and accents ignored. */
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

/** The filters a screen sends; the first page of active projects when none is given. */
export interface ProjectsQuery {
  state?: 'active' | 'archived' | undefined;
  search?: string | undefined;
  page?: number | undefined;
}

export const projectSummarySchema = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;

export const projectsResponseSchema = z.object({
  /** One page, by name. */
  rows: z.array(projectSummarySchema),
  /** Projects matching the search in the requested state, across all pages. */
  matching: z.number().int(),
  /** Projects matching the search in each state: the counts of the tabs. */
  counts: z.object({ active: z.number().int(), archived: z.number().int() }),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type ProjectsResponse = z.infer<typeof projectsResponseSchema>;
