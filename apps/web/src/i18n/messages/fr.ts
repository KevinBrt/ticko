import type { Messages } from '../types.ts';

export const fr: Messages = {
  app: {
    name: 'Ticko',
    skipToContent: 'Aller au contenu',
    pageTitle: '{page} · Ticko',
  },
  nav: {
    label: 'Navigation principale',
    openMenu: 'Ouvrir la navigation',
    closeMenu: 'Fermer la navigation',
    issues: 'Tickets',
    myIssues: 'Mes tickets',
    workspace: 'Espace',
    projects: 'Projets',
    settings: 'Paramètres',
  },
  issues: {
    emptyTitle: 'Aucun ticket pour l’instant',
    emptyDescription: 'Les tickets créés dans vos projets apparaîtront ici.',
  },
  myIssues: {
    emptyTitle: 'Rien ne vous est assigné',
    emptyDescription: 'Les tickets qui vous sont assignés ou que vous avez créés apparaîtront ici.',
  },
  projects: {
    emptyTitle: 'Aucun projet pour l’instant',
    emptyDescription: 'Un projet regroupe des tickets sous une clé courte, comme WEB ou API.',
  },
  settings: {
    emptyTitle: 'Rien à configurer pour l’instant',
    emptyDescription: 'Les workflows, champs personnalisés, labels et rôles se configureront ici.',
  },
  notFound: {
    title: 'Page introuvable',
    description: 'Cette page n’existe pas ou a été déplacée.',
    backToIssues: 'Retour aux tickets',
  },
};
