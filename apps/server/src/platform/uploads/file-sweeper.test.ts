import { createDatabase } from '@toppo/db';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { createTestFileStorage } from '../../test-helpers.ts';
import { startFileSweeper } from './file-sweeper.ts';

const unusedDb = createDatabase({ url: 'postgres://toppo:toppo@127.0.0.1:1/unused' }).db;

describe('startFileSweeper', () => {
  it('sweeps at once, logs a failed sweep rather than stopping, and stops when asked', async () => {
    const files = await createTestFileStorage();
    const log = Fastify({ logger: false }).log;
    const failed = vi.spyOn(log, 'error');
    const sweep = vi
      .spyOn(files, 'sweep')
      .mockRejectedValueOnce(new Error('disk unreadable'))
      .mockResolvedValue(3);
    const swept = vi.spyOn(log, 'info');

    const stop = startFileSweeper({ db: unusedDb, files, log });
    await vi.waitFor(() => expect(failed).toHaveBeenCalledOnce());
    stop();

    expect(sweep).toHaveBeenCalledOnce();
    expect(failed.mock.calls[0]?.[1]).toBe('Sweeping files failed');
    expect(swept).not.toHaveBeenCalled();
  });
});
