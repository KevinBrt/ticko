import { EmptyState } from '@ticko/ui';
import { SlidersHorizontalIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import { Page } from '../layout/page.tsx';

export function SettingsPage() {
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
