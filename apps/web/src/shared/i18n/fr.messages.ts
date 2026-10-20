import type { Messages } from './i18n.types.ts';

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
  account: {
    signOut: 'Déconnexion',
    signingOut: 'Déconnexion…',
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
  setup: {
    title: 'Installer Ticko',
    intro: 'Créez le premier compte administrateur. Vous inviterez votre équipe ensuite.',
    setupCode: 'Code d’installation',
    setupCodeHelp:
      'Affiché dans les logs du serveur au démarrage. Commande : docker compose logs ticko',
    adminName: 'Votre nom',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    passwordHelp: 'Au moins {min} caractères. Une longue phrase de passe est le plus sûr.',
    submit: 'Créer le compte administrateur',
    submitting: 'Création du compte…',
    invalidCode: 'Ce code d’installation n’est pas valide. Recopiez-le depuis les logs du serveur.',
    alreadyCompleted: 'Cette instance est déjà installée. Connectez-vous.',
  },
  login: {
    title: 'Connexion à Ticko',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    submit: 'Se connecter',
    submitting: 'Connexion…',
    invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.',
  },
  password: {
    show: 'Afficher le mot de passe',
    hide: 'Masquer le mot de passe',
  },
  validation: {
    required: 'Ce champ est obligatoire.',
    email: 'Saisissez une adresse e-mail valide.',
    tooShort: 'Utilisez au moins {min} caractères.',
    tooLong: 'Utilisez au plus {max} caractères.',
    invalid: 'Cette valeur n’est pas valide.',
  },
  errors: {
    network: 'Ticko est injoignable. Vérifiez votre connexion puis réessayez.',
    tooManyRequests: 'Trop de tentatives. Patientez une minute puis réessayez.',
    unexpected: 'Une erreur est survenue. Veuillez réessayer.',
  },
};
