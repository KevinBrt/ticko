import { createRoute } from '@tanstack/react-router';
import { protectedRoute } from '../protected.route.tsx';

/** The projects: their list, and each project's own pages. */
export const projectsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/projects',
  staticData: { titleKey: 'nav.projects' },
});
