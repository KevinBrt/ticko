import { z } from 'zod';

export const PROJECT_KEY_MIN_LENGTH = 2;
export const PROJECT_KEY_MAX_LENGTH = 10;

/** An uppercase letter followed by uppercase letters or digits, e.g. `WEB` or `API2`. */
export const PROJECT_KEY_PATTERN = new RegExp(
  `^[A-Z][A-Z0-9]{${PROJECT_KEY_MIN_LENGTH - 1},${PROJECT_KEY_MAX_LENGTH - 1}}$`,
);

/** The short key that prefixes every issue number of a project (`WEB` in `WEB-42`). */
export const projectKeySchema = z.string().regex(PROJECT_KEY_PATTERN).brand<'ProjectKey'>();

export type ProjectKey = z.infer<typeof projectKeySchema>;
