import { useQuery } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { canAny } from '@toppo/core';
import { EmptyState } from '@toppo/ui';
import { LockIcon, SlidersHorizontalIcon } from 'lucide-react';
import { SessionQueries } from '../../../features/session/queries/session.queries.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { SETTINGS_PERMISSIONS } from '../../../shared/layout/navigation.constants.ts';
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
  const { data: user } = useQuery(SessionQueries.currentUser);
  // The link is hidden from these users; this covers a typed or bookmarked address.
  const allowed = canAny(user?.permissions ?? [], SETTINGS_PERMISSIONS);
  return (
    <Page title={t('nav.settings')}>
      {allowed ? (
        <EmptyState
          icon={SlidersHorizontalIcon}
          title={t('settings.emptyTitle')}
          description={t('settings.emptyDescription')}
        />
      ) : (
        <EmptyState
          icon={LockIcon}
          title={t('accessDenied.title')}
          description={t('accessDenied.description')}
        />
      )}
    </Page>
  );
}
