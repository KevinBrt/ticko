import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CSP_NONCE_PLACEHOLDER } from '@ticko/shared';
import type { FastifyInstance } from 'fastify';
import { type AppDependencies, buildApp } from './app.ts';

export const healthyDatabase: AppDependencies['database'] = { ping: async () => undefined };

export interface TestAppOptions {
  database?: AppDependencies['database'];
  publicUrl?: string;
  webRoot?: string;
}

/** Builds the app with silent logs and a web root that does not exist unless provided. */
export function buildTestApp({
  database = healthyDatabase,
  publicUrl = 'http://localhost:3000',
  webRoot = join(tmpdir(), 'ticko-no-web-root'),
}: TestAppOptions = {}): Promise<FastifyInstance> {
  return buildApp({
    config: { publicUrl: new URL(publicUrl), logLevel: 'silent', trustProxy: false },
    database,
    webRoot,
  });
}

/** A throwaway compiled web app: `index.html`, a hashed asset and a root file. */
export function createWebRoot(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'ticko-web-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(
    join(root, 'index.html'),
    `<!doctype html><meta property="csp-nonce" nonce="${CSP_NONCE_PLACEHOLDER}"><title>Ticko</title>`,
  );
  writeFileSync(join(root, 'assets', 'app-abc123.js'), 'console.log("ticko")');
  writeFileSync(join(root, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
