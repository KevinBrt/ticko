import { z } from 'zod';
import { PRIORITY_LEVELS } from './fields.ts';
import { checkOptions } from './options.ts';

export const PRIORITY_NAME_MAX_LENGTH = 40;

export const priorityNameSchema = z.string().trim().min(1).max(PRIORITY_NAME_MAX_LENGTH);

/** A level as the settings save it: renamed, maybe the default, never added nor removed. */
export const priorityDraftSchema = z.object({
  id: z.uuid(),
  name: priorityNameSchema,
  isDefault: z.boolean(),
});

export type PriorityDraft = z.input<typeof priorityDraftSchema>;

/** Body of `PUT /api/v1/priorities`: the four levels, saved at once. */
export const prioritiesRequestSchema = z.object({
  priorities: z.array(priorityDraftSchema).length(PRIORITY_LEVELS.length).superRefine(checkOptions),
});

export type PrioritiesRequest = z.input<typeof prioritiesRequestSchema>;

/** Body of `GET /api/v1/priorities`. */
export const prioritiesResponseSchema = z.object({
  /** Lowest first. */
  priorities: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      level: z.union(PRIORITY_LEVELS.map((level) => z.literal(level))),
      isDefault: z.boolean(),
    }),
  ),
});

export type PrioritiesResponse = z.infer<typeof prioritiesResponseSchema>;

export type PriorityRow = PrioritiesResponse['priorities'][number];
