const SECOND = 1000;
const FIRST_RETRY_MS = 30 * SECOND;
const LONGEST_RETRY_MS = 6 * 60 * 60 * SECOND;
/** Each retry waits four times longer than the one before. */
const GROWTH = 4;
/** Up to a fifth earlier or later, so that jobs failed together do not retry together. */
const JITTER = 0.2;

/**
 * How long a job waits before its next try once it failed `attempts` times: 30 s, then about
 * 2 min, 8 min, 32 min, 2 h, never more than 6 h. `random` (from 0 to 1) spreads the retries.
 */
export function retryDelay(attempts: number, random: number): number {
  const base = Math.min(FIRST_RETRY_MS * GROWTH ** Math.max(0, attempts - 1), LONGEST_RETRY_MS);
  return Math.round(base * (1 + JITTER * (2 * random - 1)));
}
