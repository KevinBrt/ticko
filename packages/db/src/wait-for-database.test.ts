import { describe, expect, it, vi } from 'vitest';
import { waitForDatabase } from './wait-for-database.ts';

describe('waitForDatabase', () => {
  it('resolves as soon as the database answers', async () => {
    const ping = vi.fn().mockResolvedValue(undefined);
    await waitForDatabase({ ping }, { delayMs: 0 });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('retries until the database answers', async () => {
    const ping = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await waitForDatabase({ ping }, { delayMs: 0, onRetry });

    expect(ping).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenLastCalledWith(2, expect.any(Error));
  });

  it('gives up after the last attempt and keeps the original error as cause', async () => {
    const failure = new Error('ECONNREFUSED');
    const ping = vi.fn().mockRejectedValue(failure);

    const result = waitForDatabase({ ping }, { attempts: 3, delayMs: 0 });

    await expect(result).rejects.toThrow('Database unreachable after 3 attempts');
    await expect(result).rejects.toHaveProperty('cause', failure);
    expect(ping).toHaveBeenCalledTimes(3);
  });
});
