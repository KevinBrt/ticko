import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { indexRoute } from './routes/protected/index.route.tsx';
import { issuesRoute } from './routes/protected/issues/issues.route.tsx';
import { myIssuesRoute } from './routes/protected/issues/my-issues.route.tsx';
import { notFoundRoute } from './routes/protected/not-found.route.tsx';
import { projectsRoute } from './routes/protected/projects/projects.route.tsx';
import { protectedRoute } from './routes/protected/protected.route.tsx';
import { settingsRoute } from './routes/protected/settings/settings.route.tsx';
import { loginRoute } from './routes/public/login.route.tsx';
import { setupRoute } from './routes/public/setup.route.tsx';
import { rootRoute } from './routes/root.route.tsx';
import type { PlainMessageKey } from './shared/i18n/i18n.types.ts';

const routeTree = rootRoute.addChildren([
  // Reachable without a session.
  setupRoute,
  loginRoute,
  // Behind sign-in, inside the application frame.
  protectedRoute.addChildren([
    indexRoute,
    issuesRoute,
    myIssuesRoute,
    projectsRoute,
    settingsRoute,
    notFoundRoute,
  ]),
]);

export function createAppRouter({
  queryClient,
  history,
}: {
  queryClient: QueryClient;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Route guards read the query cache; TanStack Query decides when data is stale.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    ...(history ? { history } : {}),
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
