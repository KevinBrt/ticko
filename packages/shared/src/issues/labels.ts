import { z } from 'zod';
import { PALETTE_COLORS } from '../colors.ts';
import { checkDistinctOptions } from './options.ts';

/** Labels of the instance: one list, short enough to be read whole in a menu. */
export const LABELS_MAX = 100;

/** Mirrors the `labels_name_length` check of the database. */
export const LABEL_NAME_MAX_LENGTH = 40;

export const labelNameSchema = z.string().trim().min(1).max(LABEL_NAME_MAX_LENGTH);

/** A label as an issue, a list or a menu shows it. */
export const labelRefSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.enum(PALETTE_COLORS),
});

export type LabelRef = z.infer<typeof labelRefSchema>;

/** A label as the settings save it: an existing one by its id, a new one without. */
export const labelDraftSchema = z.object({
  id: z.uuid().optional(),
  name: labelNameSchema,
  color: z.enum(PALETTE_COLORS),
});

export type LabelDraft = z.input<typeof labelDraftSchema>;

/**
 * Body of `PUT /api/v1/labels`: the whole list, saved at once, and the labels it deletes, taken
 * off their issues.
 */
export const labelsRequestSchema = z
  .object({
    labels: z.array(labelDraftSchema).max(LABELS_MAX).superRefine(checkDistinctOptions),
    /**
     * Named rather than left out: a label added by someone else meanwhile, missing from the list
     * too, is never deleted by mistake.
     */
    removed: z.array(z.uuid()).max(LABELS_MAX),
  })
  .refine(
    ({ labels, removed }) => !labels.some(({ id }) => id !== undefined && removed.includes(id)),
    { message: 'A label is kept and removed', path: ['removed'] },
  );

export type LabelsRequest = z.input<typeof labelsRequestSchema>;

/** Body of `GET /api/v1/labels`: every label, by name, with how many issues have it. */
export const labelsResponseSchema = z.object({
  labels: z.array(labelRefSchema.extend({ issueCount: z.number().int() })).max(LABELS_MAX),
});

export type LabelsResponse = z.infer<typeof labelsResponseSchema>;

export type LabelRow = LabelsResponse['labels'][number];

/** Body of `PUT /api/v1/issues/:issueKey/labels`: every label the issue has from now on. */
export const issueLabelsRequestSchema = z.object({
  labelIds: z
    .array(z.uuid())
    .max(LABELS_MAX)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'A label is given twice' }),
});

export type IssueLabelsRequest = z.input<typeof issueLabelsRequestSchema>;
