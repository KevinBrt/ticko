import { EmptyState } from '@ticko/ui';
import { UserIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import { Page } from '../layout/page.tsx';

export function MyIssuesPage() {
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
