import { createRoute } from '@tanstack/react-router';
import { EmptyState } from '@toppo/ui';
import { UserIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { protectedRoute } from '../protected.route.tsx';

export const myIssuesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/my-issues',
  staticData: { titleKey: 'nav.myIssues' },
  component: MyIssuesScreen,
});

function MyIssuesScreen() {
  const { t } = useI18n();
  return (
    <Page title={t('nav.myIssues')}>
      <EmptyState
        icon={UserIcon}
        title={t('myIssues.emptyTitle')}
        description={t('myIssues.emptyDescription')}
      />
    </Page>
  );
}
