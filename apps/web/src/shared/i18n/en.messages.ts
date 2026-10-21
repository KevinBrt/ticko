/**
 * English messages: the source of truth for every user-facing string.
 * Placeholders use `{name}`; their names become required, typed parameters of `t()`.
 */
export const en = {
  app: {
    name: 'Toppo',
    skipToContent: 'Skip to content',
    pageTitle: '{page} · Toppo',
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
  account: {
    signOut: 'Sign out',
    signingOut: 'Signing out…',
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
  setup: {
    title: 'Set up Toppo',
    intro: 'Create the first administrator account. You will invite your team afterwards.',
    setupCode: 'Setup code',
    setupCodeHelp: 'Printed in the server logs at startup. Run: docker compose logs toppo',
    adminName: 'Your name',
    email: 'Email',
    password: 'Password',
    passwordHelp: 'At least {min} characters. A long passphrase is the safest choice.',
    submit: 'Create administrator account',
    submitting: 'Creating account…',
    invalidCode: 'This setup code is not valid. Copy it again from the server logs.',
    alreadyCompleted: 'This instance is already set up. Sign in instead.',
  },
  login: {
    title: 'Sign in to Toppo',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    invalidCredentials: 'Incorrect email or password.',
  },
  password: {
    show: 'Show password',
    hide: 'Hide password',
  },
  validation: {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    tooShort: 'Use at least {min} characters.',
    tooLong: 'Use at most {max} characters.',
    invalid: 'This value is not valid.',
  },
  errors: {
    network: 'Toppo cannot be reached. Check your connection and try again.',
    tooManyRequests: 'Too many attempts. Wait a minute, then try again.',
    unexpected: 'Something went wrong. Please try again.',
  },
} as const;
