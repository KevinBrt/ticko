import type { LinkProps } from '@tanstack/react-router';
import {
  FolderKanbanIcon,
  InboxIcon,
  type LucideIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from 'lucide-react';
import type { PlainMessageKey } from '../i18n/types.ts';

export interface NavItem {
  to: NonNullable<LinkProps['to']>;
  labelKey: PlainMessageKey;
  icon: LucideIcon;
}

export interface NavSection {
  /** Sections without a label are shown first, without a heading. */
  labelKey?: PlainMessageKey;
  items: readonly NavItem[];
}

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
      { to: '/settings', labelKey: 'nav.settings', icon: SlidersHorizontalIcon },
    ],
  },
];
