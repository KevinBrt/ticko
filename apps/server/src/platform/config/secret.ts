import { randomBytes } from 'node:crypto';
import { link, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SECRET_MIN_LENGTH } from './config.ts';

const SECRET_FILE = 'secret.key';
const SECRET_BYTES = 32;

/**
 * Returns the key that signs sessions: `TOPPO_SECRET` when set, otherwise the key stored in the
 * data directory, generated on first start (readable by the server user only). Losing it signs
 * every user out; it is part of the `/data` backup.
 */
export async function resolveSecret(
  configured: string | undefined,
  dataDir: string,
): Promise<string> {
  if (configured !== undefined) {
    return configured;
  }
  const path = join(dataDir, SECRET_FILE);
  return (await readSecret(path)) ?? (await createSecret(dataDir, path));
}

/**
 * Writes a complete temporary file, then publishes it with `link`, which is atomic and fails if
 * the key exists: concurrent starts never read a half-written key, and the first one wins.
 */
async function createSecret(dataDir: string, path: string): Promise<string> {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const temporary = `${path}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporary, `${secret}\n`, { mode: 0o600 });
  try {
    await link(temporary, path);
    return secret;
  } catch (error) {
    const winner = errorCode(error) === 'EEXIST' ? await readSecret(path) : undefined;
    if (winner === undefined) {
      throw error;
    }
    return winner;
  } finally {
    await rm(temporary, { force: true });
  }
}

async function readSecret(path: string): Promise<string | undefined> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  const secret = content.trim();
  if (secret.length < SECRET_MIN_LENGTH) {
    throw new Error(`${path} is corrupted: expected at least ${SECRET_MIN_LENGTH} characters`);
  }
  return secret;
}

function errorCode(error: unknown): unknown {
  return error instanceof Error ? Reflect.get(error, 'code') : undefined;
}
