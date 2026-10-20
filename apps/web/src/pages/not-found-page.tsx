import { Link } from '@tanstack/react-router';
import { buttonVariants, EmptyState } from '@ticko/ui';
import { CompassIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import { Page } from '../layout/page.tsx';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <Page title={t('notFound.title')}>
      <EmptyState
        icon={CompassIcon}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link to="/issues" className={buttonVariants({ variant: 'secondary' })}>
            {t('notFound.backToIssues')}
          </Link>
        }
      />
    </Page>
  );
}
