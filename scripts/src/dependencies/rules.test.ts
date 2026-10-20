import { describe, expect, it } from 'vitest';
import {
  checkExactVersions,
  checkLockfile,
  checkWorkspaceGraph,
  isLicenseAllowed,
  type WorkspaceManifest,
} from './rules.ts';

const workspace = (
  path: string,
  name: string,
  dependencies: Record<string, string> = {},
  devDependencies: Record<string, string> = {},
): WorkspaceManifest => ({ path, name, dependencies, devDependencies });

const shared = workspace('packages/shared', '@ticko/shared');
const db = workspace('packages/db', '@ticko/db');
const testing = workspace('packages/testing', '@ticko/testing');
const sdk = workspace('packages/plugin-sdk', '@ticko/plugin-sdk');

describe('checkWorkspaceGraph', () => {
  it('accepts the documented architecture', () => {
    const core = workspace('packages/core', '@ticko/core', { '@ticko/shared': '0.0.0' });
    const server = workspace(
      'apps/server',
      '@ticko/server',
      { '@ticko/core': '0.0.0', '@ticko/db': '0.0.0' },
      { '@ticko/testing': '0.0.0' },
    );
    expect(checkWorkspaceGraph([shared, core, db, testing, server])).toStrictEqual([]);
  });

  it('keeps core free of infrastructure', () => {
    const core = workspace('packages/core', '@ticko/core', { '@ticko/db': '0.0.0' });
    expect(checkWorkspaceGraph([core, db])).toStrictEqual([
      '@ticko/core: must not depend on @ticko/db',
    ]);
  });

  it('keeps server code out of the browser bundle', () => {
    const web = workspace('apps/web', '@ticko/web', { '@ticko/db': '0.0.0' });
    expect(checkWorkspaceGraph([web, db])).toStrictEqual([
      '@ticko/web: must not depend on @ticko/db',
    ]);
  });

  it('only lets plugins use the SDK', () => {
    const plugin = workspace('plugins/github', '@ticko/plugin-github', {
      '@ticko/plugin-sdk': '0.0.0',
      '@ticko/db': '0.0.0',
    });
    expect(checkWorkspaceGraph([plugin, sdk, db])).toStrictEqual([
      '@ticko/plugin-github: must not depend on @ticko/db',
    ]);
  });

  it('refuses test helpers as a runtime dependency', () => {
    const server = workspace('apps/server', '@ticko/server', { '@ticko/testing': '0.0.0' });
    expect(checkWorkspaceGraph([server, testing])).toStrictEqual([
      '@ticko/server: @ticko/testing may only be a devDependency',
    ]);
  });

  it('asks for rules when a new workspace appears', () => {
    expect(checkWorkspaceGraph([workspace('packages/mailer', '@ticko/mailer')])).toStrictEqual([
      expect.stringContaining('@ticko/mailer: unknown workspace'),
    ]);
  });
});

describe('checkExactVersions', () => {
  it.each(['^1.2.3', '~1.2.3', '*', 'latest', '>=1', 'github:user/repo', 'file:../x'])(
    'refuses %s',
    (spec) => {
      expect(
        checkExactVersions([workspace('apps/web', '@ticko/web', { react: spec })]),
      ).toHaveLength(1);
    },
  );

  it('accepts exact and prerelease versions', () => {
    expect(
      checkExactVersions([workspace('apps/web', '@ticko/web', { a: '1.2.3', b: '1.0.0-rc.4' })]),
    ).toStrictEqual([]);
  });

  it('requires one version of a dependency across workspaces', () => {
    expect(
      checkExactVersions([
        workspace('packages/core', '@ticko/core', {}, { vitest: '5.0.5' }),
        workspace('packages/db', '@ticko/db', {}, { vitest: '5.0.4' }),
      ]),
    ).toStrictEqual(['vitest: one version across the monorepo, found 5.0.5, 5.0.4']);
  });
});

describe('checkLockfile', () => {
  const entry = {
    version: '1.0.0',
    resolved: 'https://registry.npmjs.org/a/-/a-1.0.0.tgz',
    integrity: 'sha512-abc',
    license: 'MIT',
  };

  it('accepts registry packages and workspace links', () => {
    expect(
      checkLockfile({
        lockfileVersion: 3,
        packages: {
          '': {},
          'node_modules/a': entry,
          'node_modules/@ticko/core': { link: true },
          'packages/core': {},
        },
      }),
    ).toStrictEqual([]);
  });

  it('refuses packages from other sources', () => {
    const problems = checkLockfile({
      lockfileVersion: 3,
      packages: {
        'node_modules/a': { ...entry, resolved: 'https://evil.example.com/a.tgz' },
        'node_modules/b': { ...entry, resolved: 'git+ssh://git@github.com/x/b.git' },
      },
    });
    expect(problems).toHaveLength(2);
  });

  it('requires integrity hashes', () => {
    const { integrity: _ignored, ...withoutIntegrity } = entry;
    expect(
      checkLockfile({ lockfileVersion: 3, packages: { 'node_modules/a': withoutIntegrity } }),
    ).toStrictEqual(['node_modules/a: missing sha512 integrity']);
  });

  it('checks licenses of shipped packages only', () => {
    expect(
      checkLockfile({
        lockfileVersion: 3,
        packages: {
          'node_modules/gpl-tool': { ...entry, license: 'GPL-3.0-only', dev: true },
          'node_modules/gpl-lib': { ...entry, license: 'GPL-3.0-only' },
        },
      }),
    ).toStrictEqual(['node_modules/gpl-lib: license GPL-3.0-only is not allowed in shipped code']);
  });

  it('refuses old lockfile formats', () => {
    expect(checkLockfile({ lockfileVersion: 2, packages: {} })).toHaveLength(1);
  });
});

describe('isLicenseAllowed', () => {
  it.each([
    ['MIT', true],
    ['(MIT OR Apache-2.0)', true],
    ['(MIT OR GPL-3.0-only)', true],
    ['MIT AND BSD-3-Clause', true],
    ['MIT AND GPL-3.0-only', false],
    ['SSPL-1.0', false],
    ['UNLICENSED', false],
    [undefined, false],
  ])('%s → %s', (expression, allowed) => {
    expect(isLicenseAllowed(expression)).toBe(allowed);
  });
});
