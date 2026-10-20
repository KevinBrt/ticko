import { readFileSync } from 'node:fs';
import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Config {
  /** Public URL users reach Ticko at, e.g. `https://ticko.example.com`. */
  publicUrl: URL;
  host: string;
  port: number;
  databaseUrl: string;
  logLevel: LogLevel;
  /** Trust `X-Forwarded-*` headers. Enable only when Ticko is reachable solely through a reverse proxy. */
  trustProxy: boolean;
}

const envSchema = z.object({
  TICKO_URL: z
    .url({ protocol: /^https?$/ })
    .default('http://localhost:3000')
    .transform((value) => new URL(value))
    .refine((url) => url.pathname === '/' && url.search === '' && url.hash === '', {
      message: 'must be an origin without path, query or fragment, e.g. https://ticko.example.com',
    }),
  TICKO_HOST: z.string().min(1).default('0.0.0.0'),
  TICKO_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  TICKO_DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'must be a postgres:// URL',
  }),
  TICKO_LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  TICKO_TRUST_PROXY: z.stringbool().default(false),
});

const KNOWN_VARIABLES = new Set(Object.keys(envSchema.shape));

/** Suffix that reads a variable from a file, for Docker secrets: `TICKO_DATABASE_URL_FILE=/run/secrets/db`. */
const FILE_SUFFIX = '_FILE';

export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

type Env = Record<string, string | undefined>;
type ReadFile = (path: string) => string;

const readFileUtf8: ReadFile = (path) => readFileSync(path, 'utf8');

/** Reads and validates `TICKO_*` variables. Throws a `ConfigError` listing every problem at once. */
export function loadConfig(env: Env, readFile: ReadFile = readFileUtf8): Config {
  const issues: string[] = [];
  const values = resolveVariables(env, readFile, issues);
  const result = envSchema.safeParse(values);

  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push(`${issue.path.join('.')}: ${issue.message}`);
    }
  }
  if (!result.success || issues.length > 0) {
    throw new ConfigError(issues);
  }

  const parsed = result.data;
  return {
    publicUrl: parsed.TICKO_URL,
    host: parsed.TICKO_HOST,
    port: parsed.TICKO_PORT,
    databaseUrl: parsed.TICKO_DATABASE_URL,
    logLevel: parsed.TICKO_LOG_LEVEL,
    trustProxy: parsed.TICKO_TRUST_PROXY,
  };
}

function resolveVariables(env: Env, readFile: ReadFile, issues: string[]): Env {
  const values: Env = {};

  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('TICKO_') || value === undefined) {
      continue;
    }
    const target = name.endsWith(FILE_SUFFIX) ? name.slice(0, -FILE_SUFFIX.length) : name;
    if (!KNOWN_VARIABLES.has(target)) {
      issues.push(`${name}: unknown variable (typo?)`);
      continue;
    }
    if (target === name) {
      values[target] ??= value;
      continue;
    }
    if (env[target] !== undefined) {
      issues.push(`${name}: cannot be combined with ${target}`);
      continue;
    }
    try {
      values[target] = readFile(value).trim();
    } catch {
      issues.push(`${name}: cannot read file ${value}`);
    }
  }

  return values;
}
