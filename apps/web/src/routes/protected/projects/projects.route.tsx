import { createRoute } from '@tanstack/react-router';
import { EmptyState } from '@toppo/ui';
import { FolderKanbanIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { protectedRoute } from '../protected.route.tsx';

export const projectsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/projects',
  staticData: { titleKey: 'nav.projects' },
  component: ProjectsScreen,
});

function ProjectsScreen() {
  const { t } = useI18n();
  return (
    <Page title={t('nav.projects')}>
      <EmptyState
        icon={FolderKanbanIcon}
        title={t('projects.emptyTitle')}
        description={t('projects.emptyDescription')}
      />
    </Page>
  );
}
