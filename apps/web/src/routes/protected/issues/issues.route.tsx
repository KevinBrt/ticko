import { createRoute } from '@tanstack/react-router';
import { EmptyState } from '@toppo/ui';
import { InboxIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { protectedRoute } from '../protected.route.tsx';

export const issuesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/issues',
  staticData: { titleKey: 'nav.issues' },
  component: IssuesScreen,
});

function IssuesScreen() {
  const { t } = useI18n();
  return (
    <Page title={t('nav.issues')}>
      <EmptyState
        icon={InboxIcon}
        title={t('issues.emptyTitle')}
        description={t('issues.emptyDescription')}
      />
    </Page>
  );
}
