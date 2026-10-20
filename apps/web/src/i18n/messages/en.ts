/**
 * English messages: the source of truth for every user-facing string.
 * Placeholders use `{name}`; their names become required, typed parameters of `t()`.
 */
export const en = {
  app: {
    name: 'Ticko',
    skipToContent: 'Skip to content',
    pageTitle: '{page} · Ticko',
  },
  nav: {
    label: 'Main navigation',
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
    issues: 'Issues',
    myIssues: 'My issues',
    workspace: 'Workspace',
    projects: 'Projects',
    settings: 'Settings',
  },
  issues: {
    emptyTitle: 'No issues yet',
    emptyDescription: 'Issues created in your projects will show up here.',
  },
  myIssues: {
    emptyTitle: 'Nothing assigned to you',
    emptyDescription: 'Issues assigned to you or reported by you will show up here.',
  },
  projects: {
    emptyTitle: 'No projects yet',
    emptyDescription: 'A project groups issues under a short key, like WEB or API.',
  },
  settings: {
    emptyTitle: 'Nothing to configure yet',
    emptyDescription: 'Workflows, custom fields, labels and roles will be configured here.',
  },
  notFound: {
    title: 'Page not found',
    description: 'This page does not exist or has been moved.',
    backToIssues: 'Back to issues',
  },
} as const;
