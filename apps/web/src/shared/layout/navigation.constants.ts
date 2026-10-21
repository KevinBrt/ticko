import type { LinkProps } from '@tanstack/react-router';
import type { Permission } from '@toppo/core';
import {
  FolderKanbanIcon,
  InboxIcon,
  type LucideIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react';
import type { PlainMessageKey } from '../i18n/i18n.types.ts';

export interface NavItem {
  to: NonNullable<LinkProps['to']>;
  labelKey: PlainMessageKey;
  icon: LucideIcon;
  /** Shown only to users holding at least one of these permissions; to everyone when absent. */
  requiresAnyOf?: readonly Permission[];
}

export interface NavSection {
  /** Sections without a label are shown first, without a heading. */
  labelKey?: PlainMessageKey;
  items: readonly NavItem[];
}

/** Each of these opens a part of the settings: instance settings, members, roles. */
export const SETTINGS_PERMISSIONS: readonly Permission[] = [
  'instance.settings.manage',
  'instance.users.manage',
  'instance.roles.manage',
];

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [
      { to: '/issues', labelKey: 'nav.issues', icon: InboxIcon },
      { to: '/my-issues', labelKey: 'nav.myIssues', icon: UserIcon },
    ],
  },
  {
    labelKey: 'nav.workspace',
    items: [
      { to: '/projects', labelKey: 'nav.projects', icon: FolderKanbanIcon },
      {
        to: '/settings',
        labelKey: 'nav.settings',
        icon: SlidersHorizontalIcon,
        requiresAnyOf: SETTINGS_PERMISSIONS,
      },
    ],
  },
];

/** The settings' own navigation, beside their pages. */
export const SETTINGS_NAV: readonly NavSection[] = [
  {
    labelKey: 'settings.organisation',
    items: [
      {
        to: '/settings/members',
        labelKey: 'members.title',
        icon: UsersIcon,
        requiresAnyOf: ['instance.users.manage'],
      },
    ],
  },
];
