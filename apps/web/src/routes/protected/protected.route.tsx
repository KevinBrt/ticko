import { useQuery } from '@tanstack/react-query';
import { createRoute, redirect, useRouter } from '@tanstack/react-router';
import { AccountFooter } from '../../features/session/components/account-footer.tsx';
import { loadSession, SessionQueries } from '../../features/session/queries/session.queries.ts';
import { AppShell } from '../../shared/layout/app-shell.tsx';
import { rootRoute } from '../root.route.tsx';

/** Everything behind sign-in, inside the application frame. */
export const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async ({ context, location }) => {
    const { setupRequired, user } = await loadSession(context.queryClient);
    if (setupRequired) {
      throw redirect({ to: '/setup', replace: true });
    }
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href }, replace: true });
    }
    return { user };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const router = useRouter();
  // From the cache rather than the route context, so a refreshed role shows without navigating.
  const { data: user } = useQuery(SessionQueries.currentUser);
  return (
    <AppShell
      audience={user ?? { permissions: [] }}
      sidebarFooter={({ onNavigate }) => (
        <AccountFooter
          onNavigate={onNavigate}
          onSignedOut={() => router.navigate({ to: '/login' })}
        />
      )}
    />
  );
}
