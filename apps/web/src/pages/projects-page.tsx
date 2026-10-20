import { EmptyState } from '@ticko/ui';
import { FolderKanbanIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import { Page } from '../layout/page.tsx';

export function ProjectsPage() {
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
