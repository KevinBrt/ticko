/** PostgreSQL's code for a row refused by a unique constraint or index. */
const UNIQUE_VIOLATION = '23505';

/**
 * Whether `error`, or what caused it, is PostgreSQL refusing a duplicate under `constraint`. Lets
 * a command answer "already taken" when a concurrent request won the race its own check lost.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    if (
      Reflect.get(current, 'code') === UNIQUE_VIOLATION &&
      Reflect.get(current, 'constraint_name') === constraint
    ) {
      return true;
    }
  }
  return false;
}
