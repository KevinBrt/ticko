import { createRoute } from '@tanstack/react-router';
import { EmptyState } from '@toppo/ui';
import { SlidersHorizontalIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { protectedRoute } from '../protected.route.tsx';

export const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/settings',
  staticData: { titleKey: 'nav.settings' },
  component: SettingsScreen,
});

function SettingsScreen() {
  const { t } = useI18n();
  return (
    <Page title={t('nav.settings')}>
      <EmptyState
        icon={SlidersHorizontalIcon}
        title={t('settings.emptyTitle')}
        description={t('settings.emptyDescription')}
      />
    </Page>
  );
}
