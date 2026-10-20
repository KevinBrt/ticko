import { describe, expect, it } from 'vitest';
import { frontLayerViolations, frontNamingProblem } from './front-structure.ts';

describe('frontNamingProblem', () => {
  it.each([
    'apps/web/src/main.tsx',
    'apps/web/src/router.tsx',
    'apps/web/src/test-helpers.tsx',
    'apps/web/src/routes/root.route.tsx',
    'apps/web/src/routes/public/login.route.tsx',
    'apps/web/src/routes/public/session-flow.test.tsx',
    'apps/web/src/routes/protected/protected.route.tsx',
    'apps/web/src/routes/protected/issues/issues.route.tsx',
    'apps/web/src/features/session/api/session.api.ts',
    'apps/web/src/features/session/queries/session.queries.ts',
    'apps/web/src/features/session/models/session.model.ts',
    'apps/web/src/features/session/utils/redirect.util.ts',
    'apps/web/src/features/session/constants/session.constants.ts',
    'apps/web/src/features/session/session-flow.test.tsx',
    'apps/web/src/features/session/components/login-form.tsx',
    'apps/web/src/features/session/components/forms/login-form.tsx',
    'apps/web/src/features/session/components/forms/setup/setup-code-field.tsx',
    'apps/web/src/features/session/utils/dates/format-date.util.ts',
    'apps/web/src/shared/api/http.client.ts',
    'apps/web/src/shared/i18n/en.messages.ts',
    'apps/web/src/shared/i18n/i18n.types.ts',
    'apps/web/src/shared/i18n/translate.util.test.ts',
    'apps/web/src/shared/layout/navigation.constants.ts',
    'packages/ui/src/index.ts',
    'packages/ui/src/lib/cn.util.ts',
    'packages/ui/src/components/button.tsx',
  ])('accepts %s', (path) => {
    expect(frontNamingProblem(path)).toBeNull();
  });

  it.each([
    ['apps/web/src/helpers.ts', 'not at the root'],
    ['apps/web/src/pages/login-page.tsx', 'organized in routes/'],
    ['apps/web/src/features/login-form.tsx', 'organized in routes/'],
    ['apps/web/src/routes/public/login-screen.tsx', '<screen>.route.tsx'],
    ['apps/web/src/routes/login.route.tsx', 'routes/public/'],
    ['apps/web/src/routes/admin/users.route.tsx', 'routes/protected/'],
    ['apps/web/src/features/session/session.api.ts', 'live in the api/ folder'],
    ['apps/web/src/features/session/session.model.ts', 'live in the models/ folder'],
    ['apps/web/src/features/session/login-form.tsx', 'live in the components/ folder'],
    ['apps/web/src/features/session/models/session.queries.ts', 'live in the queries/ folder'],
    ['apps/web/src/features/session/session.ts', 'A feature only holds'],
    ['apps/web/src/features/session/services/session.service.ts', 'A feature only holds'],
    ['apps/web/src/features/session/components/login.route.tsx', 'A feature only holds'],
    ['apps/web/src/features/session/components/a/b/c/login-form.tsx', 'at most 2 folders deep'],
    [
      'apps/web/src/features/session/components/forms/session.model.ts',
      'live in the models/ folder',
    ],
    ['packages/ui/src/lib/cn.ts', '<name>.<kind>.ts'],
  ])('refuses %s', (path, reason) => {
    expect(frontNamingProblem(path)).toContain(reason);
  });
});

describe('frontLayerViolations', () => {
  const lines = (path: string, source: string) =>
    frontLayerViolations('front-layers', path, source).map((violation) => violation.line);

  it('lets a feature use shared code and its own files', () => {
    const source = [
      "import { apiRequest } from '../../shared/api/http.client.ts';",
      "import { SessionQueries } from './session.queries.ts';",
    ].join('\n');

    expect(lines('apps/web/src/features/session/login-form.tsx', source)).toStrictEqual([]);
  });

  it('keeps features apart', () => {
    const source = "import { Issue } from '../issues/issue.model.ts';";

    expect(lines('apps/web/src/features/session/login-form.tsx', source)).toStrictEqual([1]);
  });

  it('keeps shared code free of features and screens', () => {
    const source = [
      "import { useI18n } from '../i18n/i18n-provider.tsx';",
      "import { AccountFooter } from '../../features/session/account-footer.tsx';",
      "import { appRoute } from '../../routes/app.route.tsx';",
    ].join('\n');

    expect(lines('apps/web/src/shared/layout/app-shell.tsx', source)).toStrictEqual([2, 3]);
  });

  it('lets screens compose features and shared code, but not the router', () => {
    const source = [
      "import { LoginForm } from '../../features/session/components/login-form.tsx';",
      "import { AuthLayout } from '../../shared/layout/auth-layout.tsx';",
      "import { rootRoute } from '../root.route.tsx';",
      "import { createAppRouter } from '../../router.tsx';",
    ].join('\n');

    expect(lines('apps/web/src/routes/public/login.route.tsx', source)).toStrictEqual([4]);
  });

  it('does not constrain tests, which assemble the whole app', () => {
    const source = "import { renderApp } from '../../test-helpers.tsx';";

    expect(lines('apps/web/src/shared/layout/app-shell.test.tsx', source)).toStrictEqual([]);
  });
});
