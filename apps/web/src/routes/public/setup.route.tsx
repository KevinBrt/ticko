import { createRoute, redirect, useRouter } from '@tanstack/react-router';
import { SetupForm } from '../../features/session/components/setup-form.tsx';
import { loadSession } from '../../features/session/queries/session.queries.ts';
import { useI18n } from '../../shared/i18n/i18n-provider.tsx';
import { AuthLayout } from '../../shared/layout/auth-layout.tsx';
import { rootRoute } from '../root.route.tsx';

/** First-run wizard, open only while the instance has no administrator. */
export const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  beforeLoad: async ({ context }) => {
    const { setupRequired } = await loadSession(context.queryClient);
    if (!setupRequired) {
      throw redirect({ to: '/login', replace: true });
    }
  },
  component: SetupScreen,
});

function SetupScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <AuthLayout title={t('setup.title')} intro={t('setup.intro')}>
      <SetupForm onCompleted={() => router.navigate({ to: '/issues' })} />
    </AuthLayout>
  );
}
