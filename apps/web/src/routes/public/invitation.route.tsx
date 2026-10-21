import { createRoute, Link, useLocation, useRouter } from '@tanstack/react-router';
import { AcceptInvitation } from '../../features/users/components/invitations/accept-invitation.tsx';
import { useI18n } from '../../shared/i18n/i18n-provider.tsx';
import { AuthLayout } from '../../shared/layout/auth-layout.tsx';
import { rootRoute } from '../root.route.tsx';

/**
 * Where an invitation link leads: `/invitation#<token>`. After `#`, the token never reaches the
 * server with the page request; it is sent in a request body only.
 */
export const invitationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invitation',
  component: InvitationScreen,
});

function InvitationScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const token = useLocation({ select: (location) => location.hash });

  return (
    <AuthLayout title={t('invitation.title')}>
      <AcceptInvitation
        token={token}
        onAccepted={(email) => router.navigate({ to: '/login', state: { invitedEmail: email } })}
      />
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('invitation.goToLogin')}
        </Link>
      </p>
    </AuthLayout>
  );
}
