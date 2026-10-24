import type { z } from 'zod';

/** Why a list of options cannot be saved, reported at the option concerned for the forms. */
export const OPTION_PROBLEMS = {
  /** Another option has this name, whatever the case. */
  duplicateName: 'DUPLICATE_NAME',
  duplicateId: 'DUPLICATE_ID',
  /** None or several are the default. */
  oneDefault: 'ONE_DEFAULT',
} as const;

/** An option as a settings form saves it: an existing one by its id, a new one without. */
interface OptionDraft {
  id?: string | undefined;
  name: string;
}

/**
 * What every list of options asks, the categories as the priorities: each its own name whatever
 * the case, each existing one once, and exactly one default, the one new issues get.
 */
export function checkOptions(
  options: readonly (OptionDraft & { isDefault: boolean })[],
  context: z.RefinementCtx,
): void {
  checkDistinctOptions(options, context);
  if (options.filter((option) => option.isDefault).length !== 1) {
    context.addIssue({ code: 'custom', path: [], message: OPTION_PROBLEMS.oneDefault });
  }
}

/** Each option its own name whatever the case, each existing one once: a list without a default. */
export function checkDistinctOptions(
  options: readonly OptionDraft[],
  context: z.RefinementCtx,
): void {
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const [index, option] of options.entries()) {
    const name = option.name.toLowerCase();
    if (names.has(name)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'name'],
        message: OPTION_PROBLEMS.duplicateName,
      });
    }
    names.add(name);
    if (option.id !== undefined) {
      if (ids.has(option.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: OPTION_PROBLEMS.duplicateId,
        });
      }
      ids.add(option.id);
    }
  }
}
