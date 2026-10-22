import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import {
  actionsFor,
  can,
  canActOnProjectMember,
  canGiveProjectRole,
  canMoveTo,
  canSeeIssue,
  DEFAULT_CATEGORIES,
  DEFAULT_PRIORITIES,
  DEFAULT_ROLE_IDS,
  DEFAULT_ROLES,
  DEFAULT_STATUSES,
  DEFAULT_TRANSITIONS,
  type InstancePermission,
  instancePermissionsOf,
  issueActionsOf,
  issueChanges,
  issueVisibilityOf,
  type ProjectPermission,
  permissionsOfRole,
  projectColorFor,
  projectPermissionsOf,
  rolePermissionsFrom,
} from '@toppo/core';
import {
  type CurrentUser,
  ISSUES_PAGE_SIZE,
  type IssueActivity,
  type IssueResponse,
  type IssueSummary,
  type Locale,
  MEMBERS_PAGE_SIZE,
  type MemberRow,
  type PaletteColor,
  type PendingInvitation,
  PROJECT_ACCESS_PAGE_SIZE,
  PROJECT_MEMBERS_PREVIEW,
  PROJECTS_PAGE_SIZE,
  type ProjectAccessRow,
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
  // The fake server works it out from its projects.
  managesProjects: false,
};

/** A team member, who manages nothing in the instance. */
export const GRACE: CurrentUser = {
  id: '01a1569b-9900-7000-8000-000000000002',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  permissions: instancePermissionsOfRole(DEFAULT_ROLE_IDS.team),
  managesProjects: false,
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
export type FakeRole = Omit<RoleDetails, 'memberCount' | 'invitationCount' | 'projectCount'>;

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
  /** None unless a test adds some. */
  projects: FakeProject[];
  /** Members given every project, by id. */
  allProjects: Set<string>;
  /** The projects each invitation gives, by invitation id; none when absent. */
  invitationProjects: Map<string, { allProjects: boolean; projectKeys: string[] }>;
  /** None unless a test adds some. */
  issues: FakeIssue[];
  /** Each issue's history, by issue key, oldest first. */
  activities: Map<string, IssueActivity[]>;
}

/** An issue as the fake server keeps it, in the instance's default workflow and fields. */
export interface FakeIssue {
  projectKey: string;
  number: number;
  title: string;
  description: string;
  statusId: string;
  categoryId: string;
  priorityId: string;
  assigneeId: string | null;
  reporterId: string;
  /** UTC ISO 8601. */
  createdAt: string;
  closedAt: string | null;
}

/** The default status, category or priority of `kind`. */
export function defaultField<T extends { kind: string }>(list: readonly T[], kind: T['kind']): T {
  const found = list.find((item) => item.kind === kind);
  if (!found) {
    throw new Error(`No default ${kind}`);
  }
  return found;
}

/** An issue for the fake server: new, a request of normal priority reported by Ada, unless said otherwise. */
export function fakeIssue(
  projectKey: string,
  number: number,
  title: string,
  overrides: Partial<FakeIssue> = {},
): FakeIssue {
  return {
    projectKey,
    number,
    title,
    description: '',
    statusId: defaultField(DEFAULT_STATUSES, 'new').id,
    categoryId: defaultField(DEFAULT_CATEGORIES, 'request').id,
    priorityId: defaultField(DEFAULT_PRIORITIES, 'normal').id,
    assigneeId: null,
    reporterId: ADA.id,
    createdAt: '2026-10-22T09:14:00.000Z',
    closedAt: null,
    ...overrides,
  };
}

/** A project as the fake server keeps it, with the members it lists and the role it gives them. */
export interface FakeProject {
  id: string;
  key: string;
  name: string;
  description: string;
  color: PaletteColor;
  archived: boolean;
  keyEditable: boolean;
  members: { userId: string; roleId: string | null }[];
}

export interface InvitationLinkState {
  email: string;
  invitedBy: string | null;
  status: 'pending' | 'expired' | 'used';
}

let fakeProjects = 0;

/** A project for the fake server: Ada and Grace in it, with their own roles, unless said otherwise. */
export function fakeProject(
  key: string,
  name: string,
  overrides: Partial<FakeProject> = {},
): FakeProject {
  fakeProjects += 1;
  return {
    id: `01a1569b-9900-7000-8000-0000000005${String(fakeProjects % 100).padStart(2, '0')}`,
    key,
    name,
    description: '',
    color: 'blue',
    archived: false,
    keyEditable: true,
    members: [
      { userId: ADA.id, roleId: null },
      { userId: GRACE.id, roleId: null },
    ],
    ...overrides,
  };
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
      projects: [],
      allProjects: new Set(),
      invitationProjects: new Map(),
      issues: [],
      activities: new Map(),
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
    'GET /api/v1/me': () =>
      json({
        user: state.user && {
          ...state.user,
          managesProjects: state.projects.some((project) => managesProject(state, project)),
        },
      }),
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
    'GET /api/v1/projects': (_body, search) => asSignedIn(state) ?? listProjects(state, search),
    'GET /api/v1/issues/assigned': (_body, search) =>
      asSignedIn(state) ?? listAssignedIssues(state, search),
    'POST /api/v1/projects': (body) =>
      asHolder(state, 'project.create') ?? createProject(state, body),
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
      : (projectRequest(state, method, url.pathname, url.searchParams, body) ??
        issueRequest(state, method, url.pathname, url.searchParams, body) ??
        userProjects(state, method, url.pathname, url.searchParams, body) ??
        changeUser(state, method, url.pathname, body) ??
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
    state.invitationProjects.set(id, {
      allProjects: body['allProjects'] === true,
      projectKeys: (body['projectKeys'] as string[] | undefined) ?? [],
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
      projectCount: 0,
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

/** The answer an anonymous caller gets, or `undefined` to go on. */
function asSignedIn(state: FakeServerState): Response | undefined {
  return state.user ? undefined : apiError(401, 'UNAUTHENTICATED');
}

/** What the signed-in user may do in `project`, or `null` out of their reach, as the server says. */
function projectPermissionsFor(
  state: FakeServerState,
  project: FakeProject,
): ProjectPermission[] | null {
  const user = state.user;
  if (!user) {
    return null;
  }
  const roleOf = (roleId: string | undefined) => state.roles.find(({ id }) => id === roleId);
  const own = roleOf(state.users.find(({ id }) => id === user.id)?.role.id) ?? {
    grantsAll: false,
    permissions: [],
  };
  const membership = project.members.find(({ userId }) => userId === user.id);
  return projectPermissionsOf({
    role: own,
    allProjects: state.allProjects.has(user.id),
    membership: membership ? { role: roleOf(membership.roleId ?? undefined) ?? null } : null,
  });
}

/** Whether the signed-in user manages `project`'s settings or access. */
function managesProject(state: FakeServerState, project: FakeProject): boolean {
  const permissions = projectPermissionsFor(state, project) ?? [];
  return can(permissions, 'project.settings.manage') || can(permissions, 'project.members.manage');
}

const byName = (left: { name: string; key: string }, right: { name: string; key: string }) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) ||
  left.key.localeCompare(right.key);

/** `GET /api/v1/projects`: the projects the user reaches or manages, searched, by state, paged. */
function listProjects(state: FakeServerState, search: URLSearchParams): Response {
  const archived = search.get('state') === 'archived';
  const managed = search.get('scope') === 'managed';
  const needle = fold(search.get('search') ?? '');
  const page = Number(search.get('page') ?? '1');
  const visible = state.projects
    .filter((project) =>
      managed ? managesProject(state, project) : projectPermissionsFor(state, project) !== null,
    )
    .filter(({ key, name }) => [key, name].some((text) => fold(text).includes(needle)))
    .sort(byName);
  const inState = visible.filter((project) => project.archived === archived);
  return json({
    rows: inState
      .slice((page - 1) * PROJECTS_PAGE_SIZE, page * PROJECTS_PAGE_SIZE)
      .map(({ id, key, name, description, color, members }) => {
        const listed = members
          .flatMap(({ userId }) => state.users.filter((user) => user.id === userId))
          .sort((left, right) => left.name.localeCompare(right.name));
        return {
          id,
          key,
          name,
          description,
          color,
          members: {
            count: listed.length,
            shown: listed
              .slice(0, PROJECT_MEMBERS_PREVIEW)
              .map((user) => ({ userId: user.id, name: user.name })),
          },
          issues: managed ? issueStatsOf(state, key) : null,
        };
      }),
    matching: inState.length,
    counts: {
      active: visible.filter((project) => !project.archived).length,
      archived: visible.filter((project) => project.archived).length,
    },
    page,
    pageSize: PROJECTS_PAGE_SIZE,
  });
}

/** A project's open and urgent issues, as the projects screen shows them. */
function issueStatsOf(state: FakeServerState, projectKey: string) {
  const urgent = defaultField(DEFAULT_PRIORITIES, 'urgent').id;
  const open = state.issues.filter((issue) => issue.projectKey === projectKey && !issue.closedAt);
  return {
    open: open.length,
    urgent: open.filter((issue) => issue.priorityId === urgent).length,
    lastActivityAt: null,
  };
}

/** `POST /api/v1/projects`: its creator gets access. */
function createProject(state: FakeServerState, body: Record<string, unknown>): Response {
  const key = String(body['key']);
  if (state.projects.some((project) => project.key === key)) {
    return apiError(409, 'PROJECT_KEY_TAKEN');
  }
  const id = `01a1569b-9900-7000-8000-0000000004${String(state.projects.length).padStart(2, '0')}`;
  state.projects.push({
    id,
    key,
    name: String(body['name']).trim(),
    description: String(body['description'] ?? '').trim(),
    color: projectColorFor(state.projects.length),
    archived: false,
    keyEditable: true,
    members: state.user ? [{ userId: state.user.id, roleId: null }] : [],
  });
  return json({ id, key }, 201);
}

const PROJECT_PATH =
  /^\/api\/v1\/projects\/([^/]+)(?:\/(archive|unarchive|access|members|invitations|candidates|roles|issues|issue-fields|assignees))?(?:\/([^/]+))?$/;

/** `/api/v1/projects/:key` and what hangs off it, with the server's rules. */
function projectRequest(
  state: FakeServerState,
  method: string,
  path: string,
  search: URLSearchParams,
  body: unknown,
): Response | undefined {
  const match = PROJECT_PATH.exec(path);
  if (!match) {
    return undefined;
  }
  const [, key, part = '', target = ''] = match;
  const project = state.projects.find((candidate) => candidate.key === key);
  const permissions = project ? projectPermissionsFor(state, project) : null;
  if (!(project && permissions)) {
    return asSignedIn(state) ?? apiError(404, 'PROJECT_NOT_FOUND');
  }
  const unless = (permission: ProjectPermission, answer: () => Response) => {
    if (!can(permissions, permission)) {
      return apiError(403, 'FORBIDDEN');
    }
    const writes = method !== 'GET' && part !== 'unarchive';
    return writes && project.archived ? apiError(409, 'PROJECT_ARCHIVED') : answer();
  };
  const fields = (body ?? {}) as Record<string, unknown>;
  switch (`${method} ${part}`) {
    case 'GET ': {
      const { members: _members, ...shown } = project;
      return json({ ...shown, permissions });
    }
    case 'PATCH ':
      return unless('project.settings.manage', () => updateProject(state, project, fields));
    case 'DELETE ':
      // An instance permission, held through one's own role.
      return (
        asHolder(state, 'project.delete') ??
        (() => {
          state.projects = state.projects.filter((candidate) => candidate !== project);
          return NO_CONTENT();
        })()
      );
    case 'POST archive':
    case 'POST unarchive':
      return unless('project.settings.manage', () => {
        project.archived = part === 'archive';
        return NO_CONTENT();
      });
    case 'GET access':
      return unless('project.members.manage', () => projectAccess(state, project, search));
    case 'DELETE invitations':
      return unless('project.members.manage', () => {
        const access = state.invitationProjects.get(target);
        if (!access?.projectKeys.includes(project.key)) {
          return apiError(404, 'INVITATION_NOT_FOUND');
        }
        access.projectKeys = access.projectKeys.filter((other) => other !== project.key);
        return NO_CONTENT();
      });
    case 'POST members':
    case 'PATCH members':
    case 'DELETE members':
      return unless('project.members.manage', () =>
        changeProjectMembers(state, project, permissions, method, target, fields),
      );
    case 'GET candidates':
      return unless('project.members.manage', () => {
        const needle = fold(search.get('search') ?? '');
        return json({
          people: state.users
            .filter(({ id }) => !project.members.some((member) => member.userId === id))
            .filter((user) => accessReason(state, project, user) === null)
            .filter(({ name, email }) => [name, email].some((text) => fold(text).includes(needle)))
            .map(({ id, name, email }) => ({ id, name, email })),
        });
      });
    case 'GET issues':
      return listIssues(state, project, permissions, search);
    case 'POST issues':
      return unless('issue.create', () => createIssue(state, project, fields));
    case 'GET issue-fields':
      return json(issueFields());
    case 'GET assignees':
      return unless('issue.assign', () => {
        const needle = fold(search.get('search') ?? '');
        return json({
          people: state.users
            .filter((user) => !user.deactivatedAt && accessReason(state, project, user) !== null)
            .filter(({ name, email }) => [name, email].some((text) => fold(text).includes(needle)))
            .map(({ id, name, email }) => ({ id, name, email })),
        });
      });
    case 'GET roles':
      return unless('project.members.manage', () =>
        json({
          roles: badgesOf(state).filter((badge) => {
            const role = state.roles.find(({ id }) => id === badge.id);
            return role !== undefined && canGiveProjectRole(permissions, role);
          }),
        }),
      );
    default:
      return apiError(404, 'NOT_FOUND');
  }
}

function updateProject(
  state: FakeServerState,
  project: FakeProject,
  fields: Record<string, unknown>,
): Response {
  if (project.archived) {
    return apiError(409, 'PROJECT_ARCHIVED');
  }
  const key = String(fields['key']);
  if (key !== project.key && !project.keyEditable) {
    return apiError(409, 'PROJECT_KEY_FIXED');
  }
  if (state.projects.some((other) => other !== project && other.key === key)) {
    return apiError(409, 'PROJECT_KEY_TAKEN');
  }
  Object.assign(project, {
    key,
    name: String(fields['name']).trim(),
    description: String(fields['description']).trim(),
  });
  return NO_CONTENT();
}

/** How `user` reaches `project` whatever its members, or `null` through them only. */
function accessReason(
  state: FakeServerState,
  project: FakeProject,
  user: UserSummary,
): 'systemRole' | 'allProjects' | 'member' | null {
  if (state.roles.find(({ id }) => id === user.role.id)?.grantsAll) {
    return 'systemRole';
  }
  if (state.allProjects.has(user.id)) {
    return 'allProjects';
  }
  return project.members.some((member) => member.userId === user.id) ? 'member' : null;
}

const ACCESS_ORDER = { systemRole: 0, allProjects: 1, member: 2 } as const;

/** `GET /api/v1/projects/:key/access`: people by how they reach the project, then invitations. */
function projectAccess(
  state: FakeServerState,
  project: FakeProject,
  search: URLSearchParams,
): Response {
  const needle = fold(search.get('search') ?? '');
  const page = Number(search.get('page') ?? '1');
  const people = state.users
    .filter(({ name, email }) => [name, email].some((text) => fold(text).includes(needle)))
    .flatMap((user) => {
      const access = accessReason(state, project, user);
      const roleId = project.members.find((member) => member.userId === user.id)?.roleId;
      return access
        ? [
            {
              kind: 'person' as const,
              userId: user.id,
              name: user.name,
              email: user.email,
              access,
              ownRole: user.role,
              projectRole: badgesOf(state).find(({ id }) => id === roleId) ?? null,
              deactivatedAt: user.deactivatedAt,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        ACCESS_ORDER[left.access] - ACCESS_ORDER[right.access] ||
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );
  const invitations = state.invitations.flatMap((invitation): ProjectAccessRow[] => {
    const access = state.invitationProjects.get(invitation.id);
    const gives = access && (access.allProjects || access.projectKeys.includes(project.key));
    return gives && fold(invitation.email).includes(needle)
      ? [
          {
            kind: 'invitation',
            invitationId: invitation.id,
            email: invitation.email,
            role: invitation.role,
            allProjects: access.allProjects,
            expiresAt: invitation.expiresAt,
          },
        ]
      : [];
  });
  const rows = [...people, ...invitations];
  return json({
    rows: rows.slice((page - 1) * PROJECT_ACCESS_PAGE_SIZE, page * PROJECT_ACCESS_PAGE_SIZE),
    matching: rows.length,
    page,
    pageSize: PROJECT_ACCESS_PAGE_SIZE,
  });
}

/** Adds, changes or removes members; nobody gets more than the caller holds in the project. */
function changeProjectMembers(
  state: FakeServerState,
  project: FakeProject,
  permissions: readonly ProjectPermission[],
  method: string,
  userId: string,
  fields: Record<string, unknown>,
): Response {
  const roleId = (fields['roleId'] as string | null | undefined) ?? null;
  const role = state.roles.find(({ id }) => id === roleId);
  if (method !== 'DELETE' && role && !canGiveProjectRole(permissions, role)) {
    return apiError(403, 'ROLE_BEYOND_YOURS');
  }
  if (method === 'POST') {
    for (const id of (fields['userIds'] as string[] | undefined) ?? []) {
      if (!project.members.some((member) => member.userId === id)) {
        project.members.push({ userId: id, roleId });
      }
    }
    return NO_CONTENT();
  }
  const member = project.members.find((candidate) => candidate.userId === userId);
  if (!member) {
    return apiError(404, 'MEMBER_NOT_FOUND');
  }
  const refusal = memberRefusal(state, permissions, member, roleId);
  if (refusal) {
    return refusal;
  }
  if (method === 'DELETE') {
    project.members = project.members.filter((candidate) => candidate !== member);
  } else {
    member.roleId = roleId;
  }
  return NO_CONTENT();
}

/** Why a change to `member` is refused, or `undefined` when it may go on. */
function memberRefusal(
  state: FakeServerState,
  permissions: readonly ProjectPermission[],
  member: FakeProject['members'][number],
  roleId: string | null,
): Response | undefined {
  const roleOf = (id: string | undefined) => state.roles.find((role) => role.id === id);
  const ownRole = roleOf(state.users.find(({ id }) => id === member.userId)?.role.id);
  if (roleId && ownRole?.grantsAll) {
    return apiError(409, 'SYSTEM_ROLE_HOLDER');
  }
  const current = roleOf(member.roleId ?? ownRole?.id);
  return current && !canActOnProjectMember(permissions, current)
    ? apiError(403, 'ROLE_BEYOND_YOURS')
    : undefined;
}

/** `/api/v1/users/:id/projects` and `/api/v1/users/:id/projects/:key`. */
function userProjects(
  state: FakeServerState,
  method: string,
  path: string,
  search: URLSearchParams,
  body: unknown,
): Response | undefined {
  const match = /^\/api\/v1\/users\/([^/]+)\/projects(?:\/([^/]+))?$/.exec(path);
  if (!match) {
    return undefined;
  }
  const refusal = asUserManager(state);
  if (refusal) {
    return refusal;
  }
  const [, userId = '', key] = match;
  const reachable = state.projects.filter(
    (project) => !project.archived && projectPermissionsFor(state, project) !== null,
  );
  const isMember = (project: FakeProject) =>
    project.members.some((member) => member.userId === userId);
  if (method === 'GET') {
    const needle = fold(search.get('search') ?? '');
    return json({
      allProjects: state.allProjects.has(userId),
      rows: reachable
        .filter((project) =>
          [project.key, project.name].some((text) => fold(text).includes(needle)),
        )
        .sort(
          (left, right) => Number(isMember(right)) - Number(isMember(left)) || byName(left, right),
        )
        .map((project) => ({ key: project.key, name: project.name, member: isMember(project) })),
    });
  }
  if (!key) {
    if ((body as { allProjects?: boolean } | undefined)?.allProjects === true) {
      state.allProjects.add(userId);
    } else {
      state.allProjects.delete(userId);
    }
    return NO_CONTENT();
  }
  const project = reachable.find((candidate) => candidate.key === key);
  if (!project) {
    return apiError(404, 'PROJECT_NOT_FOUND');
  }
  if (method === 'PUT' && !isMember(project)) {
    project.members.push({ userId, roleId: null });
  }
  if (method === 'DELETE') {
    project.members = project.members.filter((member) => member.userId !== userId);
  }
  return NO_CONTENT();
}

/** Someone an issue names, as the server does: a deleted account loses its name. */
function userRef(state: FakeServerState, id: string) {
  const user = state.users.find((candidate) => candidate.id === id);
  return { id, name: user?.name ?? null };
}

/** The response's shape of an issue's fields, from the instance's defaults. */
function issueFields() {
  const idOf = (kind: string) => DEFAULT_STATUSES.find((status) => status.kind === kind)?.id ?? '';
  return {
    statuses: DEFAULT_STATUSES.map(({ id, name, color, category, initial, kind }) => ({
      id,
      name,
      color,
      category,
      isInitial: initial,
      next: DEFAULT_TRANSITIONS.filter(({ from }) => from === kind).map(({ to }) => idOf(to)),
    })),
    categories: DEFAULT_CATEGORIES.map(({ id, name, color, isDefault }) => ({
      id,
      name,
      color,
      isDefault,
    })),
    priorities: DEFAULT_PRIORITIES.map(({ id, name, level, isDefault }) => ({
      id,
      name,
      level,
      isDefault,
    })),
  };
}

const keyOf = (issue: FakeIssue) => `${issue.projectKey}-${issue.number}`;

function summaryOf(state: FakeServerState, issue: FakeIssue): IssueSummary {
  const fields = issueFields();
  const status = fields.statuses.find(({ id }) => id === issue.statusId);
  const category = fields.categories.find(({ id }) => id === issue.categoryId);
  const priority = fields.priorities.find(({ id }) => id === issue.priorityId);
  if (!(status && category && priority)) {
    throw new Error(`${keyOf(issue)} has a field the defaults do not know`);
  }
  return {
    key: keyOf(issue),
    title: issue.title,
    status: { id: status.id, name: status.name, color: status.color, category: status.category },
    category: { id: category.id, name: category.name, color: category.color },
    priority: { id: priority.id, name: priority.name, level: priority.level },
    assignee: issue.assigneeId ? userRef(state, issue.assigneeId) : null,
    reporter: userRef(state, issue.reporterId),
    createdAt: issue.createdAt,
    updatedAt: issue.createdAt,
  };
}

/** `GET /api/v1/projects/:key/issues`: newest first, only one's own when that is all one sees. */
function listIssues(
  state: FakeServerState,
  project: FakeProject,
  permissions: readonly ProjectPermission[],
  search: URLSearchParams,
): Response {
  const page = Number(search.get('page') ?? '1');
  const visibility = issueVisibilityOf(permissions);
  const visible = state.issues
    .filter((issue) => issue.projectKey === project.key)
    .filter(
      (issue) =>
        visibility === 'all' || (visibility === 'own' && issue.reporterId === state.user?.id),
    )
    .sort((left, right) => right.number - left.number);
  return json({
    rows: visible
      .slice((page - 1) * ISSUES_PAGE_SIZE, page * ISSUES_PAGE_SIZE)
      .map((issue) => summaryOf(state, issue)),
    matching: visible.length,
    page,
    pageSize: ISSUES_PAGE_SIZE,
  });
}

/**
 * `GET /api/v1/issues/assigned`: the signed-in user's issues they may still read, out of archived
 * projects, the most urgent first, then the newest.
 */
function listAssignedIssues(state: FakeServerState, search: URLSearchParams): Response {
  const page = Number(search.get('page') ?? '1');
  const visible = state.issues
    .filter((issue) => issue.assigneeId === state.user?.id)
    .flatMap((issue) => {
      const project = state.projects.find((candidate) => candidate.key === issue.projectKey);
      const permissions = project ? projectPermissionsFor(state, project) : null;
      const reported = issue.reporterId === state.user?.id;
      return project && !project.archived && permissions && canSeeIssue(permissions, reported)
        ? [
            {
              ...summaryOf(state, issue),
              project: { key: project.key, name: project.name, color: project.color },
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        right.priority.level - left.priority.level || right.createdAt.localeCompare(left.createdAt),
    );
  return json({
    rows: visible.slice((page - 1) * ISSUES_PAGE_SIZE, page * ISSUES_PAGE_SIZE),
    matching: visible.length,
    page,
    pageSize: ISSUES_PAGE_SIZE,
  });
}

function record(
  state: FakeServerState,
  key: string,
  change: Omit<IssueActivity, 'id' | 'actor' | 'createdAt'>,
) {
  const history = state.activities.get(key) ?? [];
  history.push({
    id: `01a1569b-9900-7000-8000-0000000008${String(history.length).padStart(2, '0')}`,
    actor: userRef(state, state.user?.id ?? ''),
    createdAt: new Date().toISOString(),
    ...change,
  } as IssueActivity);
  state.activities.set(key, history);
}

/** `POST /api/v1/projects/:key/issues`: the next number, the defaults, its reporter the caller. */
function createIssue(
  state: FakeServerState,
  project: FakeProject,
  fields: Record<string, unknown>,
): Response {
  const number =
    Math.max(
      0,
      ...state.issues
        .filter((issue) => issue.projectKey === project.key)
        .map((issue) => issue.number),
    ) + 1;
  const issue = fakeIssue(project.key, number, String(fields['title']).trim(), {
    description: String(fields['description'] ?? ''),
    ...(fields['categoryId'] ? { categoryId: String(fields['categoryId']) } : {}),
    ...(fields['priorityId'] ? { priorityId: String(fields['priorityId']) } : {}),
    reporterId: state.user?.id ?? '',
    createdAt: new Date().toISOString(),
  });
  state.issues.push(issue);
  record(state, keyOf(issue), { type: 'issue.created', payload: {} });
  return json(
    {
      id: `01a1569b-9900-7000-8000-0000000007${String(number).padStart(2, '0')}`,
      key: keyOf(issue),
    },
    201,
  );
}

const ISSUE_PATH = /^\/api\/v1\/issues\/([^/]+)(?:\/(status|assignee|activities))?$/;

/** An issue the signed-in user sees, with its project and what they may do there. */
interface SeenIssue {
  issue: FakeIssue;
  project: FakeProject;
  permissions: ProjectPermission[];
  actions: ReturnType<typeof issueActionsOf>;
}

/** The issue with `key` as the server finds it, or its refusal: one out of sight does not exist. */
function seenIssue(state: FakeServerState, key: string): SeenIssue | Response {
  const issue = state.issues.find((candidate) => keyOf(candidate) === key);
  const project = state.projects.find((candidate) => candidate.key === issue?.projectKey);
  const permissions = project ? projectPermissionsFor(state, project) : null;
  const reported = issue?.reporterId === state.user?.id;
  if (!(issue && project && permissions && canSeeIssue(permissions, reported))) {
    return asSignedIn(state) ?? apiError(404, 'ISSUE_NOT_FOUND');
  }
  return { issue, project, permissions, actions: issueActionsOf(permissions, reported) };
}

/** `/api/v1/issues/:key` and what hangs off it, with the server's rules. */
function issueRequest(
  state: FakeServerState,
  method: string,
  path: string,
  search: URLSearchParams,
  body: unknown,
): Response | undefined {
  const match = ISSUE_PATH.exec(path);
  if (!match) {
    return undefined;
  }
  const [, key = '', part = ''] = match;
  const seen = seenIssue(state, key);
  if (seen instanceof Response) {
    return seen;
  }
  if (method !== 'GET' && seen.project.archived) {
    return apiError(409, 'PROJECT_ARCHIVED');
  }
  const fields = (body ?? {}) as Record<string, unknown>;
  const { issue, project, permissions, actions } = seen;
  const unless = (permission: ProjectPermission, answer: () => Response) =>
    can(permissions, permission) ? answer() : apiError(403, 'FORBIDDEN');
  switch (`${method} ${part}`) {
    case 'GET ':
      return json({
        ...summaryOf(state, issue),
        id: '01a1569b-9900-7000-8000-000000000700',
        project: { key: project.key, name: project.name },
        description: issue.description,
        closedAt: issue.closedAt,
        actions,
      } satisfies IssueResponse);
    case 'PATCH ':
      return updateIssue(state, issue, actions, fields);
    case 'PUT status':
      return unless('issue.update', () => moveIssue(state, issue, String(fields['statusId'])));
    case 'PUT assignee':
      return unless('issue.assign', () =>
        assignIssue(state, issue, (fields['assigneeId'] as string | null | undefined) ?? null),
      );
    case 'DELETE ':
      return unless('issue.delete', () => {
        state.issues = state.issues.filter((candidate) => candidate !== issue);
        return NO_CONTENT();
      });
    case 'GET activities': {
      const history = state.activities.get(key) ?? [];
      return json({
        // Newest first; a stable sort keeps changes made together in the order they were made.
        rows: history.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
        matching: history.length,
        page: Number(search.get('page') ?? '1'),
        pageSize: 50,
      });
    }
    default:
      return apiError(404, 'NOT_FOUND');
  }
}

function assignIssue(state: FakeServerState, issue: FakeIssue, to: string | null): Response {
  record(state, keyOf(issue), {
    type: 'issue.assigneeChanged',
    payload: {
      from: issue.assigneeId ? userRef(state, issue.assigneeId) : null,
      to: to ? userRef(state, to) : null,
    },
  });
  issue.assigneeId = to;
  return NO_CONTENT();
}

function updateIssue(
  state: FakeServerState,
  issue: FakeIssue,
  actions: readonly string[],
  fields: Record<string, unknown>,
): Response {
  const text = (name: string) => (typeof fields[name] === 'string' ? fields[name] : undefined);
  const changes = issueChanges(issue, {
    title: text('title'),
    description: text('description'),
    categoryId: text('categoryId'),
    priorityId: text('priorityId'),
  });
  if (actionsFor(changes).some((action) => !actions.includes(action))) {
    return apiError(403, 'FORBIDDEN');
  }
  const named = issueFields();
  for (const { field, from, to } of changes) {
    issue[field] = to;
    const key = keyOf(issue);
    if (field === 'title' || field === 'description') {
      record(state, key, {
        type: field === 'title' ? 'issue.titleChanged' : 'issue.descriptionChanged',
        payload: { from, to },
      });
    } else if (field === 'categoryId') {
      const name = (id: string) => ({
        id,
        name: named.categories.find((category) => category.id === id)?.name ?? '',
      });
      record(state, key, {
        type: 'issue.categoryChanged',
        payload: { from: name(from), to: name(to) },
      });
    } else {
      const level = (id: string) => named.priorities.find((priority) => priority.id === id);
      const ref = (id: string) => ({
        id,
        name: level(id)?.name ?? '',
        level: level(id)?.level ?? 2,
      });
      record(state, key, {
        type: 'issue.priorityChanged',
        payload: { from: ref(from), to: ref(to) },
      });
    }
  }
  return NO_CONTENT();
}

/** `PUT /api/v1/issues/:key/status`: only where the workflow goes from the current status. */
function moveIssue(state: FakeServerState, issue: FakeIssue, statusId: string): Response {
  const statuses = issueFields().statuses;
  const transitions = statuses.flatMap(({ id, next }) =>
    next.map((to) => ({ fromStatusId: id, toStatusId: to })),
  );
  if (!canMoveTo(transitions, issue.statusId, statusId)) {
    return apiError(409, 'STATUS_NOT_ALLOWED');
  }
  const from = statuses.find(({ id }) => id === issue.statusId);
  const to = statuses.find(({ id }) => id === statusId);
  record(state, keyOf(issue), {
    type: 'issue.statusChanged',
    payload: {
      from: { id: issue.statusId, name: from?.name ?? '' },
      to: { id: statusId, name: to?.name ?? '' },
    },
  });
  issue.statusId = statusId;
  issue.closedAt = to?.category === 'done' ? (issue.closedAt ?? new Date().toISOString()) : null;
  return NO_CONTENT();
}
