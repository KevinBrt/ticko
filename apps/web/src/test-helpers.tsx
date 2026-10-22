import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import {
  can,
  DEFAULT_ROLE_IDS,
  DEFAULT_ROLES,
  type InstancePermission,
  instancePermissionsOf,
  permissionsOfRole,
  rolePermissionsFrom,
} from '@toppo/core';
import {
  type CurrentUser,
  type Locale,
  MEMBERS_PAGE_SIZE,
  type MemberRow,
  type PendingInvitation,
  ROLES_MAX,
  type RoleBadge,
  type RoleDetails,
  type UserSummary,
} from '@toppo/shared';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createAppRouter } from './router.tsx';
import { I18nProvider } from './shared/i18n/i18n-provider.tsx';

const instancePermissionsOfRole = (roleId: string) => {
  const role = DEFAULT_ROLES.find((candidate) => candidate.id === roleId);
  return role ? instancePermissionsOf(role) : [];
};

/** The administrator who set the instance up. */
export const ADA: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000001',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  permissions: instancePermissionsOfRole(DEFAULT_ROLE_IDS.administrator),
};

/** A team member, who manages nothing in the instance. */
export const GRACE: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000002',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  permissions: instancePermissionsOfRole(DEFAULT_ROLE_IDS.team),
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

/** A role as the fake server keeps it; who holds it is counted from the members. */
export type FakeRole = Omit<RoleDetails, 'memberCount' | 'invitationCount'>;

/** The default roles, as a fresh instance has them. */
function defaultRoles(): FakeRole[] {
  return DEFAULT_ROLES.map(({ id, name, color, grantsAll, permissions }) => ({
    id,
    name,
    color,
    grantsAll,
    permissions: permissionsOfRole({ grantsAll, permissions }),
  }));
}

/** The roles as badges, the way member management shows them. */
const badgesOf = (state: FakeServerState): RoleBadge[] =>
  state.roles.map(({ id, name, color }) => ({ id, name, color }));

export function memberOf(user: CurrentUser, role: UserSummary['role']): UserSummary {
  return { id: user.id, name: user.name, email: user.email, role, deactivatedAt: null };
}

export interface FakeServerState {
  setupRequired: boolean;
  user: CurrentUser | null;
  /** The accounts user management sees: Ada (administrator) and Grace (team) by default. */
  users: UserSummary[];
  /** The default roles unless a test sets others. */
  roles: FakeRole[];
  invitations: PendingInvitation[];
  /** The links the fake server made, by token, and what opening them shows. */
  invitationLinks: Map<string, InvitationLinkState>;
}

export interface InvitationLinkState {
  email: string;
  invitedBy: string | null;
  status: 'pending' | 'expired' | 'used';
}

/** A well-formed invitation token, distinct for each `seed`. */
export function invitationToken(seed: number): string {
  return String(seed).padStart(43, 'x');
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
      roles: defaultRoles(),
      invitations: [],
      invitationLinks: new Map(),
      ...initial,
    },
    requests: [],
  };
  const { state } = server;

  const routes: Record<
    string,
    (body: Record<string, unknown>, search: URLSearchParams) => Response
  > = {
    'GET /api/v1/setup': () => json({ required: state.setupRequired }),
    'GET /api/v1/me': () => json({ user: state.user }),
    'PATCH /api/v1/me': (body) => {
      if (!state.user) {
        return apiError(401, 'UNAUTHENTICATED');
      }
      const name = String(body['name']).trim();
      state.user = { ...state.user, name };
      return NO_CONTENT();
    },
    'POST /api/auth/change-password': (body) => {
      if (!state.user) {
        return apiError(401, 'UNAUTHENTICATED');
      }
      // Better Auth's own error shape.
      return body['currentPassword'] === ADA_PASSWORD
        ? NO_CONTENT()
        : json({ code: 'INVALID_PASSWORD', message: 'Invalid password' }, 400);
    },
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
    'GET /api/v1/members': (_body, search) => asUserManager(state) ?? members(state, search),
    'GET /api/v1/users/roles': () => asUserManager(state) ?? json({ roles: badgesOf(state) }),
    'GET /api/v1/roles': () => asHolder(state, 'instance.roles.manage') ?? listRoles(state),
    'POST /api/v1/roles': (body) =>
      asHolder(state, 'instance.roles.manage') ?? createRole(state, body),
    'PUT /api/v1/roles/permissions': (body) =>
      asHolder(state, 'instance.roles.manage') ?? savePermissions(state, body),
    'POST /api/v1/invitations': (body) => asUserManager(state) ?? invite(state, body),
    'POST /api/v1/invitations/preview': (body) => {
      const link = state.invitationLinks.get(String(body['token']));
      return link?.status === 'pending'
        ? json({ email: link.email, invitedBy: link.invitedBy })
        : linkRefusal(link);
    },
    'POST /api/v1/invitations/accept': (body) => {
      const link = state.invitationLinks.get(String(body['token']));
      if (link?.status !== 'pending') {
        return linkRefusal(link);
      }
      link.status = 'used';
      return json({ email: link.email }, 201);
    },
  };

  vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.origin,
    );
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    server.requests.push({ method, path: url.pathname + url.search, body });
    const handler = routes[`${method} ${url.pathname}`];
    const answer = handler
      ? handler((body ?? {}) as Record<string, unknown>, url.searchParams)
      : (changeUser(state, method, url.pathname, body) ??
        changeInvitation(state, method, url.pathname) ??
        changeRoleDefinition(state, method, url.pathname, body) ??
        apiError(404, 'NOT_FOUND'));
    return await Promise.resolve(answer);
  });

  return server;
}

/** The answer a caller without `permission` gets, or `undefined` to go on. */
function asHolder(state: FakeServerState, permission: InstancePermission): Response | undefined {
  if (!state.user) {
    return apiError(401, 'UNAUTHENTICATED');
  }
  return can(state.user.permissions, permission) ? undefined : apiError(403, 'FORBIDDEN');
}

const asUserManager = (state: FakeServerState) => asHolder(state, 'instance.users.manage');

/** `PATCH /api/v1/users/:id`, `POST …/deactivate` and `POST …/reactivate`, with the server's rules. */
function changeUser(
  state: FakeServerState,
  method: string,
  path: string,
  body: unknown,
): Response | undefined {
  const match = /^\/api\/v1\/users\/([^/]+)(?:\/(deactivate|reactivate))?$/.exec(path);
  const actions: Record<string, string | undefined> = {
    PATCH: 'changeRole',
    DELETE: 'delete',
    POST: match?.[2],
  };
  const action = match?.[2] && method !== 'POST' ? undefined : actions[method];
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
  if (user.id === state.user?.id && action !== 'reactivate') {
    return apiError(409, action === 'delete' ? 'CANNOT_DELETE_SELF' : 'CANNOT_DEACTIVATE_SELF');
  }
  if (action === 'delete') {
    state.users = state.users.filter((candidate) => candidate !== user);
    return NO_CONTENT();
  }
  user.deactivatedAt = action === 'deactivate' ? '2026-10-21T08:30:00.000Z' : null;
  return NO_CONTENT();
}

function changeRole(state: FakeServerState, user: UserSummary, roleId?: string): Response {
  const role = badgesOf(state).find((candidate) => candidate.id === roleId);
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

function linkRefusal(link: InvitationLinkState | undefined): Response {
  return link?.status === 'expired'
    ? apiError(410, 'INVITATION_EXPIRED')
    : apiError(404, 'INVITATION_INVALID');
}

function newLink(state: FakeServerState, email: string): string {
  const token = invitationToken(state.invitationLinks.size + 1);
  state.invitationLinks.set(token, { email, invitedBy: state.user?.name ?? '', status: 'pending' });
  return `http://localhost:3000/invitation#${token}`;
}

/** `POST /api/v1/invitations`: inviting an address again replaces its invitation. */
function invite(state: FakeServerState, body: Record<string, unknown>): Response {
  const emails = (body['emails'] as string[] | undefined) ?? [];
  const role = badgesOf(state).find((candidate) => candidate.id === body['roleId']);
  if (!role) {
    return apiError(400, 'INVALID_ROLE');
  }
  const alreadyMembers = emails.filter((email) => state.users.some((user) => user.email === email));
  const invited = emails.filter((email) => !alreadyMembers.includes(email));
  state.invitations = state.invitations.filter((invitation) => !invited.includes(invitation.email));
  const links = invited.map((email, index) => {
    const id = `01a1569b-9900-7000-8000-0000000002${String(state.invitationLinks.size + index).padStart(2, '0')}`;
    state.invitations.push({
      id,
      email,
      role,
      invitedBy: state.user?.name ?? '',
      expiresAt: '2026-10-28T10:00:00.000Z',
    });
    return { id, email, link: newLink(state, email) };
  });
  return json({ invitations: links, alreadyMembers }, 201);
}

/** `POST /api/v1/invitations/:id/renew` and `DELETE /api/v1/invitations/:id`. */
function changeInvitation(
  state: FakeServerState,
  method: string,
  path: string,
): Response | undefined {
  const match = /^\/api\/v1\/invitations\/([^/]+?)(\/renew)?$/.exec(path);
  if (!match || (method === 'POST') !== Boolean(match[2]) || !['POST', 'DELETE'].includes(method)) {
    return undefined;
  }
  const refusal = asUserManager(state);
  const invitation = state.invitations.find((candidate) => candidate.id === match[1]);
  if (refusal || !invitation) {
    return refusal ?? apiError(404, 'INVITATION_NOT_FOUND');
  }
  if (method === 'DELETE') {
    state.invitations = state.invitations.filter((candidate) => candidate !== invitation);
    return NO_CONTENT();
  }
  return json({
    id: invitation.id,
    email: invitation.email,
    link: newLink(state, invitation.email),
  });
}

/** Lower case without accents, as the server compares. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** `GET /api/v1/members`: searches, filters, sorts and pages like the server. */
function members(state: FakeServerState, search: URLSearchParams): Response {
  const role = search.get('role');
  const needle = fold(search.get('search') ?? '');
  const page = Number(search.get('page') ?? '1');
  const label = (row: MemberRow) => (row.type === 'member' ? row.name : row.email);
  const rank = (row: MemberRow) => state.roles.findIndex(({ id }) => id === row.role.id);
  const rows: MemberRow[] = [
    ...state.users.map((user): MemberRow => ({ type: 'member', ...user })),
    ...state.invitations.map((invitation): MemberRow => ({ type: 'invitation', ...invitation })),
  ]
    .filter((row) => [label(row), row.email].some((text) => fold(text).includes(needle)))
    .sort(
      (left, right) =>
        rank(left) - rank(right) ||
        label(left).localeCompare(label(right), undefined, { sensitivity: 'base' }),
    );
  const byRole: Record<string, number> = {};
  for (const row of rows) {
    byRole[row.role.id] = (byRole[row.role.id] ?? 0) + 1;
  }
  const matching = role ? rows.filter((row) => row.role.id === role) : rows;
  return json({
    rows: matching.slice((page - 1) * MEMBERS_PAGE_SIZE, page * MEMBERS_PAGE_SIZE),
    byRole,
    matching: matching.length,
    totals: { members: state.users.length, invitations: state.invitations.length },
    page,
    pageSize: MEMBERS_PAGE_SIZE,
  });
}

/** `GET /api/v1/roles`: who holds each role is counted from the members and invitations. */
function listRoles(state: FakeServerState): Response {
  return json({
    roles: state.roles.map((role) => ({
      ...role,
      memberCount: state.users.filter((user) => user.role.id === role.id).length,
      invitationCount: state.invitations.filter((invitation) => invitation.role.id === role.id)
        .length,
    })),
  });
}

const sameName = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

/** `POST /api/v1/roles`: a role without permissions, under a name no other role has. */
function createRole(state: FakeServerState, body: Record<string, unknown>): Response {
  const name = String(body['name'] ?? '').trim();
  if (state.roles.some((role) => sameName(role.name, name))) {
    return apiError(409, 'ROLE_NAME_TAKEN');
  }
  if (state.roles.length >= ROLES_MAX) {
    return apiError(409, 'ROLE_LIMIT_REACHED');
  }
  const id = `01a1569b-9900-7000-8000-0000000003${String(state.roles.length).padStart(2, '0')}`;
  state.roles.push({
    id,
    name,
    color: body['color'] as FakeRole['color'],
    grantsAll: false,
    permissions: [],
  });
  return json({ id }, 201);
}

/** `PUT /api/v1/roles/permissions`: every change or none, refused if a role changed meanwhile. */
function savePermissions(state: FakeServerState, body: Record<string, unknown>): Response {
  const changes = (body['changes'] as { roleId: string; from: string[]; to: string[] }[]) ?? [];
  for (const { roleId, from, to } of changes) {
    const role = state.roles.find((candidate) => candidate.id === roleId);
    if (!role) {
      return apiError(404, 'ROLE_NOT_FOUND');
    }
    if (role.grantsAll) {
      return apiError(403, 'SYSTEM_ROLE_LOCKED');
    }
    if (rolePermissionsFrom(to).refused.length > 0) {
      return apiError(400, 'INVALID_PERMISSIONS');
    }
    if ([...from].sort().join() !== [...role.permissions].sort().join()) {
      return apiError(409, 'ROLES_CHANGED');
    }
  }
  for (const { roleId, to } of changes) {
    const role = state.roles.find((candidate) => candidate.id === roleId);
    if (role) {
      role.permissions = rolePermissionsFrom(to).permissions;
    }
  }
  return NO_CONTENT();
}

/** `PATCH /api/v1/roles/:id` and `DELETE /api/v1/roles/:id`. */
function changeRoleDefinition(
  state: FakeServerState,
  method: string,
  path: string,
  body: unknown,
): Response | undefined {
  const match = /^\/api\/v1\/roles\/([^/]+)$/.exec(path);
  if (!(match && ['PATCH', 'DELETE'].includes(method))) {
    return undefined;
  }
  const refusal = asHolder(state, 'instance.roles.manage');
  const role = state.roles.find((candidate) => candidate.id === match[1]);
  if (refusal || !role) {
    return refusal ?? apiError(404, 'ROLE_NOT_FOUND');
  }
  if (role.grantsAll) {
    return apiError(403, 'SYSTEM_ROLE_LOCKED');
  }
  if (method === 'DELETE') {
    const held =
      state.users.some((user) => user.role.id === role.id) ||
      state.invitations.some((invitation) => invitation.role.id === role.id);
    if (held) {
      return apiError(409, 'ROLE_IN_USE');
    }
    state.roles = state.roles.filter((candidate) => candidate !== role);
    return NO_CONTENT();
  }
  const { name, color } = body as { name: string; color: FakeRole['color'] };
  if (state.roles.some((other) => other !== role && sameName(other.name, name.trim()))) {
    return apiError(409, 'ROLE_NAME_TAKEN');
  }
  Object.assign(role, { name: name.trim(), color });
  return NO_CONTENT();
}
