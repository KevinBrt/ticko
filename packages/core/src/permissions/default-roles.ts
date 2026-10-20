import type { Locale } from '@ticko/shared';
import type { Permission, PermissionScope } from './catalog.ts';

/** The three profiles a fresh instance offers, at instance and at project level. */
export type DefaultRoleKind = 'administrator' | 'team' | 'requester';

export interface RoleDefinition {
  id: string;
  kind: DefaultRoleKind;
  /** English name, as seeded by the first migration. */
  name: string;
  scope: PermissionScope;
  permissions: readonly Permission[];
}

/**
 * Names of the default roles per language. The first-run wizard writes them in the
 * administrator's language; afterwards they are ordinary data the administrator can rename.
 */
export const DEFAULT_ROLE_NAMES: Readonly<
  Record<Locale, Readonly<Record<DefaultRoleKind, string>>>
> = {
  en: { administrator: 'Administrator', team: 'Team', requester: 'Requester' },
  fr: { administrator: 'Administrateur', team: 'Équipe', requester: 'Demandeur' },
};

/**
 * Stable ids of the roles created by the first migration. Admins can rename or edit these roles;
 * the ids only let the first-run wizard and new users get a sensible default.
 */
export const DEFAULT_ROLE_IDS = {
  instanceAdministrator: '01a1569b-9800-7e64-8269-eb18fddc30ee',
  instanceTeam: '01a1569b-9801-747e-91c9-d058653f2a8e',
  instanceRequester: '01a1569b-9802-7f0a-b82f-656d1e2109c6',
  projectAdministrator: '01a1569b-9803-7856-9230-b7dbbd83f7d9',
  projectTeam: '01a1569b-9804-7f71-aa2b-43cdaa231795',
  projectRequester: '01a1569b-9805-7b83-b2a9-d516e9cec915',
} as const;

function role(
  id: string,
  kind: DefaultRoleKind,
  scope: PermissionScope,
  permissions: readonly Permission[],
): RoleDefinition {
  return { id, kind, name: DEFAULT_ROLE_NAMES.en[kind], scope, permissions };
}

/**
 * The roles a fresh instance starts with. Mirrors the seed of the first migration (checked by tests).
 * - Administrator: configures the instance and its projects.
 * - Team: the people who work on issues (developers, support…); they see every issue of a project.
 * - Requester: people outside the team (customers, other departments); they see their own issues only.
 */
export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  role(DEFAULT_ROLE_IDS.instanceAdministrator, 'administrator', 'instance', [
    'instance.settings.manage',
    'instance.users.manage',
    'instance.roles.manage',
    'project.create',
  ]),
  role(DEFAULT_ROLE_IDS.instanceTeam, 'team', 'instance', ['project.create']),
  role(DEFAULT_ROLE_IDS.instanceRequester, 'requester', 'instance', []),
  role(DEFAULT_ROLE_IDS.projectAdministrator, 'administrator', 'project', [
    'project.settings.manage',
    'project.members.manage',
    'issue.read',
    'issue.read.own',
    'issue.create',
    'issue.update',
    'issue.assign',
    'issue.delete',
    'comment.create',
    'comment.moderate',
  ]),
  role(DEFAULT_ROLE_IDS.projectTeam, 'team', 'project', [
    'issue.read',
    'issue.read.own',
    'issue.create',
    'issue.update',
    'issue.assign',
    'comment.create',
  ]),
  role(DEFAULT_ROLE_IDS.projectRequester, 'requester', 'project', [
    'issue.read.own',
    'issue.create',
    'comment.create',
  ]),
];
