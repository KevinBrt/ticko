import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { can, DEFAULT_ROLE_IDS, DEFAULT_ROLES, instancePermissionsOf } from '@toppo/core';
import type { CurrentUser, Locale, UserSummary } from '@toppo/shared';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createAppRouter } from './router.tsx';
import { I18nProvider } from './shared/i18n/i18n-provider.tsx';

const permissionsOfRole = (roleId: string) => {
  const role = DEFAULT_ROLES.find((candidate) => candidate.id === roleId);
  return role ? instancePermissionsOf(role) : [];
};

/** The administrator who set the instance up. */
export const ADA: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  permissions: permissionsOfRole(DEFAULT_ROLE_IDS.administrator),
};

/** A team member, who manages nothing in the instance. */
export const GRACE: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000002',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  permissions: permissionsOfRole(DEFAULT_ROLE_IDS.team),
};
export const ADA_PASSWORD = 'correct horse battery staple';
export const GOOD_SETUP_CODE = 'ABCD-EFGH-JKLM';
/** Signing in with this address answers as for a deactivated account. */
export const DEACTIVATED_EMAIL = 'former@example.com';

/** The default roles as user management shows them. */
export const ROLE_BADGES = {
  administrator: { id: DEFAULT_ROLE_IDS.administrator, name: 'Administrator', color: 'blue' },
  team: { id: DEFAULT_ROLE_IDS.team, name: 'Team', color: 'green' },
  requester: { id: DEFAULT_ROLE_IDS.requester, name: 'Requester', color: 'gray' },
} as const satisfies Record<string, UserSummary['role']>;

/** The roles, as `GET /api/v1/users/roles` lists them. */
const INSTANCE_ROLES: UserSummary['role'][] = Object.values(ROLE_BADGES);

export function memberOf(user: CurrentUser, role: UserSummary['role']): UserSummary {
  return { id: user.id, name: user.name, email: user.email, role, deactivatedAt: null };
}

export interface FakeServerState {
  setupRequired: boolean;
  user: CurrentUser | null;
  /** The accounts user management sees: Ada (administrator) and Grace (team) by default. */
  users: UserSummary[];
}

export interface FakeServer {
  state: FakeServerState;
  requests: { method: string; path: string; body: unknown }[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const apiError = (status: number, code: string) => json({ error: { code, message: code } }, status);

const NO_CONTENT = () => new Response(null, { status: 204 });

/** A tiny in-memory Toppo API, answering the web app's `fetch` calls. */
export function fakeServer(initial: Partial<FakeServerState> = {}): FakeServer {
  const server: FakeServer = {
    state: {
      setupRequired: false,
      user: null,
      users: [memberOf(ADA, ROLE_BADGES.administrator), memberOf(GRACE, ROLE_BADGES.team)],
      ...initial,
    },
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
      if (body['email'] === DEACTIVATED_EMAIL) {
        return json({ code: 'ACCOUNT_DEACTIVATED', message: 'This account is deactivated' }, 403);
      }
      return json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }, 401);
    },
    'POST /api/auth/sign-out': () => {
      state.user = null;
      return json({ success: true });
    },
    'GET /api/v1/users': () => asUserManager(state) ?? json({ users: state.users }),
    'GET /api/v1/users/roles': () => asUserManager(state) ?? json({ roles: INSTANCE_ROLES }),
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
    const answer = handler
      ? handler((body ?? {}) as Record<string, unknown>)
      : (changeUser(state, method, url.pathname, body) ?? apiError(404, 'NOT_FOUND'));
    return await Promise.resolve(answer);
  });

  return server;
}

/** The answer a caller without `instance.users.manage` gets, or `undefined` to go on. */
function asUserManager(state: FakeServerState): Response | undefined {
  if (!state.user) {
    return apiError(401, 'UNAUTHENTICATED');
  }
  return can(state.user.permissions, 'instance.users.manage')
    ? undefined
    : apiError(403, 'FORBIDDEN');
}

/** `PATCH /api/v1/users/:id`, `POST …/deactivate` and `POST …/reactivate`, with the server's rules. */
function changeUser(
  state: FakeServerState,
  method: string,
  path: string,
  body: unknown,
): Response | undefined {
  const match = /^\/api\/v1\/users\/([^/]+)(?:\/(deactivate|reactivate))?$/.exec(path);
  const action = method === 'PATCH' ? 'changeRole' : match?.[2];
  if (!(match && action)) {
    return undefined;
  }
  const refusal = asUserManager(state);
  const user = state.users.find((candidate) => candidate.id === match[1]);
  if (refusal || !user) {
    return refusal ?? apiError(404, 'USER_NOT_FOUND');
  }
  if (action === 'changeRole') {
    return changeRole(state, user, (body as { roleId?: string } | undefined)?.roleId);
  }
  if (action === 'deactivate' && user.id === state.user?.id) {
    return apiError(409, 'CANNOT_DEACTIVATE_SELF');
  }
  user.deactivatedAt = action === 'deactivate' ? '2026-10-21T08:30:00.000Z' : null;
  return NO_CONTENT();
}

function changeRole(state: FakeServerState, user: UserSummary, roleId?: string): Response {
  const role = INSTANCE_ROLES.find((candidate) => candidate.id === roleId);
  if (!role) {
    return apiError(400, 'INVALID_ROLE');
  }
  const otherAdministrators = state.users.filter(
    (other) =>
      other.id !== user.id &&
      other.deactivatedAt === null &&
      other.role.id === DEFAULT_ROLE_IDS.administrator,
  );
  if (role.id !== DEFAULT_ROLE_IDS.administrator && otherAdministrators.length === 0) {
    return apiError(409, 'LAST_ADMINISTRATOR');
  }
  user.role = role;
  return NO_CONTENT();
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
