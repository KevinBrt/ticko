import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSecret } from './secret.ts';

let dataDir: string;

beforeEach(() => {
  dataDir = join(mkdtempSync(join(tmpdir(), 'ticko-secret-')), 'data');
});

afterEach(() => {
  rmSync(join(dataDir, '..'), { recursive: true, force: true });
});

describe('resolveSecret', () => {
  it('prefers the configured secret', async () => {
    expect(await resolveSecret('c'.repeat(40), dataDir)).toBe('c'.repeat(40));
  });

  it('generates a strong secret on first start and reuses it afterwards', async () => {
    const first = await resolveSecret(undefined, dataDir);
    const second = await resolveSecret(undefined, dataDir);

    expect(first).toMatch(/^[\w-]{43}$/);
    expect(second).toBe(first);
    expect(readFileSync(join(dataDir, 'secret.key'), 'utf8').trim()).toBe(first);
  });

  it.runIf(process.platform !== 'win32')('makes the key readable by its owner only', async () => {
    await resolveSecret(undefined, dataDir);

    expect(statSync(join(dataDir, 'secret.key')).mode & 0o777).toBe(0o600);
  });

  it('agrees on one secret when several processes start at once', async () => {
    const secrets = await Promise.all(
      Array.from({ length: 5 }, () => resolveSecret(undefined, dataDir)),
    );

    expect(new Set(secrets).size).toBe(1);
  });

  it('refuses a corrupted key instead of silently replacing it', async () => {
    await resolveSecret(undefined, dataDir);
    writeFileSync(join(dataDir, 'secret.key'), 'oops');

    await expect(resolveSecret(undefined, dataDir)).rejects.toThrow('is corrupted');
  });

  it('reports a data directory it cannot use', async () => {
    const file = join(dataDir, '..', 'not-a-directory');
    writeFileSync(file, '');

    await expect(resolveSecret(undefined, file)).rejects.toThrow();
  });
});
