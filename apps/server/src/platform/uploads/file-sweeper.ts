import { type Db, schema } from '@toppo/db';
import { inArray } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import type { FileStorage } from './file-storage.ts';

const { attachments } = schema;

const EVERY_HOUR_MS = 60 * 60 * 1000;

/**
 * Removes the files no attachment names any more: those of a deleted attachment, comment, issue
 * or project, of a transaction rolled back, of an upload cut short. The rows say what is kept;
 * the disk follows, so that no command has to reach it after committing.
 */
export async function sweepFiles({ db, files }: { db: Db; files: FileStorage }): Promise<number> {
  return await files.sweep(async (keys) => {
    const rows = await db
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .where(inArray(attachments.storageKey, [...keys]));
    return new Set(rows.map(({ storageKey }) => storageKey));
  });
}

/**
 * Sweeps at once, then every hour, until stopped. A failed sweep is logged and tried again an
 * hour later: nothing waits on it.
 */
export function startFileSweeper({
  db,
  files,
  log,
}: {
  db: Db;
  files: FileStorage;
  log: FastifyBaseLogger;
}): () => void {
  const sweep = async () => {
    try {
      const removed = await sweepFiles({ db, files });
      if (removed > 0) {
        log.info({ removed }, 'Swept files no attachment names');
      }
    } catch (error) {
      log.error({ err: error }, 'Sweeping files failed');
    }
  };
  void sweep();
  const timer = setInterval(() => void sweep(), EVERY_HOUR_MS);
  // Never keeps the process alive on its own.
  timer.unref();
  return () => clearInterval(timer);
}
