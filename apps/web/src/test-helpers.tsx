import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { DEFAULT_ROLE_IDS, DEFAULT_ROLES } from '@toppo/core';
import type { CurrentUser, Locale } from '@toppo/shared';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createAppRouter } from './router.tsx';
import { I18nProvider } from './shared/i18n/i18n-provider.tsx';

const permissionsOfRole = (roleId: string) => [
  ...(DEFAULT_ROLES.find((role) => role.id === roleId)?.permissions ?? []),
];

/** The administrator who set the instance up. */
export const ADA: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  permissions: permissionsOfRole(DEFAULT_ROLE_IDS.instanceAdministrator),
};

/** A team member, who manages nothing in the instance. */
export const GRACE: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000002',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  permissions: permissionsOfRole(DEFAULT_ROLE_IDS.instanceTeam),
};
export const ADA_PASSWORD = 'correct horse battery staple';
export const GOOD_SETUP_CODE = 'ABCD-EFGH-JKLM';

export interface FakeServerState {
  setupRequired: boolean;
  user: CurrentUser | null;
}

export interface FakeServer {
  state: FakeServerState;
  requests: { method: string; path: string; body: unknown }[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const apiError = (status: number, code: string) => json({ error: { code, message: code } }, status);

/** A tiny in-memory Toppo API, answering the web app's `fetch` calls. */
export function fakeServer(initial: Partial<FakeServerState> = {}): FakeServer {
  const server: FakeServer = {
    state: { setupRequired: false, user: null, ...initial },
    requests: [],
  };
  const { state } = server;

  const routes: Record<string, (body: Record<string, unknown>) => Response> = {
    'GET /api/v1/setup': () => json({ required: state.setupRequired }),
    'GET /api/v1/me': () => json({ user: state.user }),
    'POST /api/v1/setup': (body) => {
      if (!state.setupRequired) {
        return apiError(409, 'SETUP_ALREADY_COMPLETED');
      }
      const normalize = (code: unknown) =>
        String(code)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');
      if (normalize(body['setupCode']) !== normalize(GOOD_SETUP_CODE)) {
        return apiError(403, 'INVALID_SETUP_CODE');
      }
      state.setupRequired = false;
      return json({ userId: ADA.id }, 201);
    },
    'POST /api/auth/sign-in/email': (body) => {
      if (body['email'] === ADA.email && body['password'] === ADA_PASSWORD) {
        state.user = ADA;
        return json({ redirect: false, token: 'token', user: ADA });
      }
      return json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }, 401);
    },
    'POST /api/auth/sign-out': () => {
      state.user = null;
      return json({ success: true });
    },
  };

  vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    server.requests.push({ method, path: url.pathname, body });
    const handler = routes[`${method} ${url.pathname}`];
    return await Promise.resolve(
      handler ? handler((body ?? {}) as Record<string, unknown>) : apiError(404, 'NOT_FOUND'),
    );
  });

  return server;
}

/** Renders the whole app at `path`, against whatever `fakeServer()` was set up. */
export async function renderApp({
  path = '/issues',
  locale = 'en',
}: {
  path?: string;
  locale?: Locale;
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const screen = await render(
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { screen, router };
}
