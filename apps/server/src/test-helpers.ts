import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, type Database, schema, uuidv7 } from '@toppo/db';
import { CSP_NONCE_PLACEHOLDER } from '@toppo/shared';
import { createTestDatabase, type TestDatabase } from '@toppo/testing';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll } from 'vitest';
import { buildApp } from './app.ts';
import { createAuth } from './platform/auth/auth.ts';

export const TEST_SECRET = 'test-secret-that-is-long-enough-to-be-accepted';
export const TEST_SETUP_CODE = 'TEST-SETU-PCDE';

export interface TestAppOptions {
  /** A real database; by default, one that is never reached and whose ping succeeds. */
  database?: Database;
  ping?: () => Promise<void>;
  publicUrl?: string;
  webRoot?: string;
}

export function buildTestApp({
  database = createDatabase({ url: 'postgres://toppo:toppo@127.0.0.1:1/unused' }),
  ping,
  publicUrl = 'http://localhost:3000',
  webRoot = join(tmpdir(), 'toppo-no-web-root'),
}: TestAppOptions = {}): Promise<FastifyInstance> {
  const url = new URL(publicUrl);
  return buildApp({
    config: { publicUrl: url, logLevel: 'silent', trustProxy: false },
    database: { db: database.db, ping: ping ?? (() => Promise.resolve()) },
    auth: createAuth({ db: database.db, secret: TEST_SECRET, publicUrl: url }),
    setupCode: TEST_SETUP_CODE,
    webRoot,
  });
}

/** A private, migrated database for the current test file. */
export function setupTestDatabase(): { readonly database: Database } {
  let testDatabase: TestDatabase | undefined;
  let database: Database | undefined;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    database = createDatabase({ url: testDatabase.url, maxConnections: 4 });
  });

  afterAll(async () => {
    await database?.close();
    await testDatabase?.drop();
  });

  return {
    get database() {
      if (!database) {
        throw new Error('setupTestDatabase() is only available inside tests');
      }
      return database;
    },
  };
}

export interface TestUser {
  name: string;
  email: string;
  password: string;
  instanceRoleId: string;
}

/** Adds a user who can sign in with `password`, as an accepted invitation would. Returns their id. */
export async function createTestUser(database: Database, user: TestUser): Promise<string> {
  const auth = createAuth({
    db: database.db,
    secret: TEST_SECRET,
    publicUrl: new URL('http://localhost:3000'),
  });
  const passwordHash = await (await auth.$context).password.hash(user.password);
  const id = uuidv7();
  await database.db.insert(schema.users).values({
    id,
    name: user.name,
    email: user.email,
    emailVerified: true,
    instanceRoleId: user.instanceRoleId,
  });
  await database.db.insert(schema.accounts).values({
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: passwordHash,
  });
  return id;
}

/** The `name=value` pairs of a response's cookies, ready to send back in a `cookie` header. */
export function cookieHeader(response: LightMyRequestResponse): string {
  return response.cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

/** A throwaway compiled web app: `index.html`, a hashed asset and a root file. */
export function createWebRoot(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'toppo-web-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(
    join(root, 'index.html'),
    `<!doctype html><meta property="csp-nonce" nonce="${CSP_NONCE_PLACEHOLDER}"><title>Toppo</title>`,
  );
  writeFileSync(join(root, 'assets', 'app-abc123.js'), 'console.log("toppo")');
  writeFileSync(join(root, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
