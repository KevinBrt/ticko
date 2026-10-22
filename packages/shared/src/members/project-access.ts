import { z } from 'zod';
import { projectKeySchema } from '../project-key.ts';

export const userProjectParamsSchema = z.object({
  userId: z.uuid(),
  projectKey: projectKeySchema,
});

/** Body of `GET /api/v1/users/:userId/projects`: a member's access to projects. */
export const userProjectsResponseSchema = z.object({
  /** Access to every project, present and future. */
  allProjects: z.boolean(),
  /**
   * Projects matching the search among those the caller reaches, the member's first: whether the
   * member is in each one.
   */
  rows: z.array(z.object({ key: z.string(), name: z.string(), member: z.boolean() })),
});

export type UserProjectsResponse = z.infer<typeof userProjectsResponseSchema>;

/** Body of `PUT /api/v1/users/:userId/projects`. */
export const userProjectAccessRequestSchema = z.object({
  allProjects: z.boolean(),
});
