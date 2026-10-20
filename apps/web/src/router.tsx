import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router';
import type { PlainMessageKey } from './i18n/types.ts';
import { AppShell } from './layout/app-shell.tsx';
import { IssuesPage } from './pages/issues-page.tsx';
import { MyIssuesPage } from './pages/my-issues-page.tsx';
import { NotFoundPage } from './pages/not-found-page.tsx';
import { ProjectsPage } from './pages/projects-page.tsx';
import { SettingsPage } from './pages/settings-page.tsx';

const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/issues', replace: true });
  },
});

const issuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/issues',
  staticData: { titleKey: 'nav.issues' },
  component: IssuesPage,
});

const myIssuesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-issues',
  staticData: { titleKey: 'nav.myIssues' },
  component: MyIssuesPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  staticData: { titleKey: 'nav.projects' },
  component: ProjectsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  staticData: { titleKey: 'nav.settings' },
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  issuesRoute,
  myIssuesRoute,
  projectsRoute,
  settingsRoute,
]);

export function createAppRouter(options: { history?: RouterHistory } = {}) {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ...options,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface StaticDataRouteOption {
    /** Title shown in the top bar and the browser tab. */
    titleKey?: PlainMessageKey;
  }
}
