import { describe, expect, it } from 'vitest';
import { serverLayerViolations, serverNamingProblem } from './server-structure.ts';

describe('serverNamingProblem', () => {
  it.each([
    'apps/server/src/main.ts',
    'apps/server/src/app.ts',
    'apps/server/src/app.test.ts',
    'apps/server/src/healthcheck.ts',
    'apps/server/src/test-helpers.ts',
    'apps/server/src/platform/http/error-handler.ts',
    'apps/server/src/platform/cqrs/cqrs.ts',
    'apps/server/src/features/setup/setup.routes.ts',
    'apps/server/src/features/setup/commands/complete-setup.command.ts',
    'apps/server/src/features/setup/commands/complete-setup.command.test.ts',
    'apps/server/src/features/setup/queries/get-setup-status.query.ts',
    'apps/server/src/features/setup/setup.routes.test.ts',
    'apps/server/src/features/setup/utils/setup-code.util.ts',
    'apps/server/src/features/setup/utils/setup-code.util.test.ts',
    'apps/server/src/features/issues/models/issue.model.ts',
    'apps/server/src/features/notifications/jobs/send-email.job.ts',
    'apps/server/src/features/issues/commands/labels/add-label.command.ts',
  ])('accepts %s', (path) => {
    expect(serverNamingProblem(path)).toBeNull();
  });

  it.each([
    ['apps/server/src/config.ts', 'not at the root'],
    ['apps/server/src/routes/health.ts', 'organized in platform/'],
    ['apps/server/src/features/setup.ts', 'organized in platform/'],
    ['apps/server/src/features/setup/setup-service.ts', 'A feature only holds'],
    ['apps/server/src/features/issues/repositories/issue.repository.ts', 'A feature only holds'],
    ['apps/server/src/features/setup/complete-setup.command.ts', 'live in the commands/ folder'],
    [
      'apps/server/src/features/setup/queries/complete-setup.command.ts',
      'live in the commands/ folder',
    ],
    ['apps/server/src/features/setup/setup-code.util.ts', 'live in the utils/ folder'],
    ['apps/server/src/features/issues/issue.model.ts', 'live in the models/ folder'],
    ['apps/server/src/features/setup/commands/setup-code.util.ts', 'live in the utils/ folder'],
    ['apps/server/src/features/setup/utils/setup.routes.ts', 'live at the root of the feature'],
    ['apps/server/src/features/notifications/send-email.job.ts', 'live in the jobs/ folder'],
    [
      'apps/server/src/features/issues/commands/a/b/c/close-issue.command.ts',
      'at most 2 folders deep',
    ],
    [
      'apps/server/src/features/issues/utils/labels/issues.routes.ts',
      'live at the root of the feature',
    ],
  ])('refuses %s', (path, reason) => {
    expect(serverNamingProblem(path)).toContain(reason);
  });
});

describe('serverLayerViolations', () => {
  const lines = (path: string, source: string) =>
    serverLayerViolations('server-layers', path, source).map((violation) => violation.line);

  it('lets a feature use the platform and its own files', () => {
    const source = [
      "import { defineCommand } from '../../platform/cqrs/cqrs.ts';",
      "import { setupCodesMatch } from './setup-code.util.ts';",
    ].join('\n');

    expect(lines('apps/server/src/features/setup/complete-setup.command.ts', source)).toStrictEqual(
      [],
    );
  });

  it('keeps features apart', () => {
    const source = "import { createUser } from '../users/create-user.command.ts';";

    expect(lines('apps/server/src/features/setup/complete-setup.command.ts', source)).toStrictEqual(
      [1],
    );
  });

  it('keeps the platform free of features and of the app assembly', () => {
    const source = [
      "import { HttpError } from '../http/http-error.ts';",
      "import { getSetupStatus } from '../../features/setup/get-setup-status.query.ts';",
      "import { buildApp } from '../../app.ts';",
    ].join('\n');

    expect(lines('apps/server/src/platform/auth/access-control.ts', source)).toStrictEqual([2, 3]);
  });

  it('lets the app assembly wire everything', () => {
    const source = [
      "import { registerSetupRoutes } from './features/setup/setup.routes.ts';",
      "import { registerErrorHandler } from './platform/http/error-handler.ts';",
    ].join('\n');

    expect(lines('apps/server/src/app.ts', source)).toStrictEqual([]);
  });
});
