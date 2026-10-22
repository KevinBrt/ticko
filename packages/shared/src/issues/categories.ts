import { z } from 'zod';
import { PALETTE_COLORS } from '../colors.ts';
import { checkOptions } from './options.ts';

/** Categories of the instance: few enough for the creation form to show them all as cards. */
export const CATEGORIES_MAX = 20;

export const CATEGORY_NAME_MAX_LENGTH = 40;

export const categoryNameSchema = z.string().trim().min(1).max(CATEGORY_NAME_MAX_LENGTH);

/** A category as the settings save it: an existing one by its id, a new one without. */
export const categoryDraftSchema = z.object({
  id: z.uuid().optional(),
  name: categoryNameSchema,
  color: z.enum(PALETTE_COLORS),
  isDefault: z.boolean(),
});

export type CategoryDraft = z.input<typeof categoryDraftSchema>;

/**
 * Body of `PUT /api/v1/categories`: the whole list, in its new order, saved at once, and the
 * categories it deletes, which only a category no issue has can be.
 */
export const categoriesRequestSchema = z
  .object({
    categories: z.array(categoryDraftSchema).min(1).max(CATEGORIES_MAX).superRefine(checkOptions),
    /**
     * Named rather than left out: a category added by someone else meanwhile, missing from the
     * list too, is never deleted by mistake.
     */
    removed: z.array(z.uuid()).max(CATEGORIES_MAX),
  })
  .refine(
    ({ categories, removed }) =>
      !categories.some(({ id }) => id !== undefined && removed.includes(id)),
    { message: 'A category is kept and removed', path: ['removed'] },
  );

export type CategoriesRequest = z.input<typeof categoriesRequestSchema>;

/** Body of `GET /api/v1/categories`. */
export const categoriesResponseSchema = z.object({
  /** In their order. */
  categories: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      color: z.enum(PALETTE_COLORS),
      isDefault: z.boolean(),
      /** A category can be deleted only once no issue has it. */
      issueCount: z.number().int(),
    }),
  ),
});

export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export type CategoryRow = CategoriesResponse['categories'][number];
