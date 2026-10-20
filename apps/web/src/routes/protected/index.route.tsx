import { createRoute, redirect } from '@tanstack/react-router';
import { protectedRoute } from './protected.route.tsx';

export const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/issues', replace: true });
  },
});
