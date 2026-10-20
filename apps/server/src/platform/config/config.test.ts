import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './config.ts';

const DATABASE_URL = 'postgres://ticko:secret@db:5432/ticko';
const minimalEnv = { TICKO_DATABASE_URL: DATABASE_URL };

function issuesOf(run: () => unknown): readonly string[] {
  try {
    run();
  } catch (error) {
    if (error instanceof ConfigError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error('Expected a ConfigError');
}

describe('loadConfig', () => {
  it('applies safe defaults when only the database is configured', () => {
    const config = loadConfig(minimalEnv);

    expect(config).toMatchObject({
      host: '0.0.0.0',
      port: 3000,
      databaseUrl: DATABASE_URL,
      logLevel: 'info',
      trustProxy: false,
      dataDir: '/data',
      secret: undefined,
      setupCode: undefined,
    });
    expect(config.publicUrl.href).toBe('http://localhost:3000/');
  });

  it('reads every supported variable', () => {
    const config = loadConfig({
      TICKO_URL: 'https://ticko.example.com',
      TICKO_HOST: '127.0.0.1',
      TICKO_PORT: '8080',
      TICKO_DATABASE_URL: 'postgresql://db/ticko',
      TICKO_LOG_LEVEL: 'warn',
      TICKO_TRUST_PROXY: 'true',
      TICKO_DATA_DIR: '/srv/ticko',
      TICKO_SECRET: 's'.repeat(32),
      TICKO_SETUP_CODE: 'ABCD-EFGH-JKLM',
    });

    expect(config).toMatchObject({
      host: '127.0.0.1',
      port: 8080,
      databaseUrl: 'postgresql://db/ticko',
      logLevel: 'warn',
      trustProxy: true,
      dataDir: '/srv/ticko',
      secret: 's'.repeat(32),
      setupCode: 'ABCD-EFGH-JKLM',
    });
    expect(config.publicUrl.origin).toBe('https://ticko.example.com');
  });

  it('ignores variables outside the TICKO_ namespace', () => {
    expect(() =>
      loadConfig({ ...minimalEnv, PATH: '/usr/bin', NODE_ENV: 'production' }),
    ).not.toThrow();
  });

  it('requires the database URL', () => {
    expect(issuesOf(() => loadConfig({}))).toStrictEqual([
      expect.stringContaining('TICKO_DATABASE_URL'),
    ]);
  });

  it('reports every invalid variable at once', () => {
    const issues = issuesOf(() =>
      loadConfig({
        TICKO_DATABASE_URL: 'mysql://db/ticko',
        TICKO_PORT: '70000',
        TICKO_LOG_LEVEL: 'verbose',
        TICKO_TRUST_PROXY: 'maybe',
      }),
    );

    expect(issues).toHaveLength(4);
    expect(issues.join('\n')).toMatch(/TICKO_DATABASE_URL: must be a postgres:\/\/ URL/);
  });

  it.each([
    ['ftp://ticko.example.com', 'non-HTTP protocol'],
    ['https://example.com/ticko', 'a path'],
    ['https://ticko.example.com/?a=1', 'a query string'],
    ['not a url', 'garbage'],
  ])('rejects TICKO_URL %s (%s)', (url) => {
    expect(issuesOf(() => loadConfig({ ...minimalEnv, TICKO_URL: url }))).toStrictEqual([
      expect.stringContaining('TICKO_URL'),
    ]);
  });

  it('refuses a short secret or setup code, which could be guessed', () => {
    const issues = issuesOf(() =>
      loadConfig({ ...minimalEnv, TICKO_SECRET: 'short', TICKO_SETUP_CODE: '1234' }),
    );

    expect(issues).toStrictEqual([
      'TICKO_SECRET: must be at least 32 characters',
      'TICKO_SETUP_CODE: must be at least 12 characters',
    ]);
  });

  it('treats empty variables as unset, as Docker Compose passes them', () => {
    const config = loadConfig({
      ...minimalEnv,
      TICKO_SECRET: '',
      TICKO_SETUP_CODE: '',
      TICKO_PORT: '',
    });

    expect(config).toMatchObject({ secret: undefined, setupCode: undefined, port: 3000 });
  });

  it('rejects unknown TICKO_ variables to catch typos', () => {
    expect(issuesOf(() => loadConfig({ ...minimalEnv, TICKO_DATABSE_URL: 'x' }))).toStrictEqual([
      'TICKO_DATABSE_URL: unknown variable (typo?)',
    ]);
  });

  describe('_FILE variables (Docker secrets)', () => {
    it('reads the value from the file, without the trailing newline', () => {
      const files: Record<string, string> = { '/run/secrets/db': `${DATABASE_URL}\n` };
      const config = loadConfig({ TICKO_DATABASE_URL_FILE: '/run/secrets/db' }, (path) => {
        const content = files[path];
        if (content === undefined) {
          throw new Error('ENOENT');
        }
        return content;
      });

      expect(config.databaseUrl).toBe(DATABASE_URL);
    });

    it('reports an unreadable file', () => {
      const issues = issuesOf(() =>
        loadConfig({ TICKO_DATABASE_URL_FILE: '/missing' }, () => {
          throw new Error('ENOENT');
        }),
      );
      expect(issues).toContain('TICKO_DATABASE_URL_FILE: cannot read file /missing');
    });

    it('refuses a variable set both directly and through a file', () => {
      const issues = issuesOf(() =>
        loadConfig(
          { ...minimalEnv, TICKO_DATABASE_URL_FILE: '/run/secrets/db' },
          () => DATABASE_URL,
        ),
      );
      expect(issues).toStrictEqual([
        'TICKO_DATABASE_URL_FILE: cannot be combined with TICKO_DATABASE_URL',
      ]);
    });

    it('rejects a _FILE variable for an unknown setting', () => {
      expect(issuesOf(() => loadConfig({ ...minimalEnv, TICKO_NOPE_FILE: '/x' }))).toStrictEqual([
        'TICKO_NOPE_FILE: unknown variable (typo?)',
      ]);
    });
  });

  it('never includes secret values in error messages', () => {
    const error = (() => {
      try {
        loadConfig({ TICKO_DATABASE_URL: 'mysql://user:hunter2@db/ticko' });
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();
    expect(String(error)).not.toContain('hunter2');
  });
});
