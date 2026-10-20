import { setTimeout as sleep } from 'node:timers/promises';
import type { Database } from './database.ts';

export interface WaitForDatabaseOptions {
  attempts?: number;
  delayMs?: number;
  /** Called after each failed attempt, e.g. to log progress. */
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Pings the database until it answers. Containers often start before PostgreSQL accepts connections,
 * so the server waits a little instead of crashing on boot.
 */
export async function waitForDatabase(
  database: Pick<Database, 'ping'>,
  { attempts = 30, delayMs = 1000, onRetry }: WaitForDatabaseOptions = {},
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await database.ping();
      return;
    } catch (error) {
      if (attempt >= attempts) {
        throw new Error(`Database unreachable after ${attempts} attempts`, { cause: error });
      }
      onRetry?.(attempt, error);
      await sleep(delayMs);
    }
  }
}
