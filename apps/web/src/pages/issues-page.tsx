import { EmptyState } from '@ticko/ui';
import { InboxIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import { Page } from '../layout/page.tsx';

export function IssuesPage() {
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
