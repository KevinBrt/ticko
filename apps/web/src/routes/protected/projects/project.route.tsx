import { useQuery } from '@tanstack/react-query';
import { createRoute, Outlet } from '@tanstack/react-router';
import { EmptyState } from '@toppo/ui';
import { FolderXIcon } from 'lucide-react';
import { ProjectsQueries } from '../../../features/projects/queries/projects.queries.ts';
import { ApiRequestError } from '../../../shared/api/http.client.ts';
import { requestErrorMessage } from '../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { projectsRoute } from './projects.route.tsx';

/**
 * One project's pages. A project out of reach answers like one that does not exist: the screen
 * says so the same way, never that it is forbidden.
 */
export const projectRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: '$projectKey',
  staticData: { crumbParam: 'projectKey' },
  component: ProjectLayout,
});

function ProjectLayout() {
  const { t } = useI18n();
  const { projectKey } = projectRoute.useParams();
  const project = useQuery(ProjectsQueries.detail(projectKey));

  if (project.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('projects.loading')}
      </p>
    );
  }
  if (project.isError) {
    const missing = project.error instanceof ApiRequestError && project.error.status === 404;
    return (
      <Page title={missing ? t('notFound.title') : projectKey}>
        <EmptyState
          icon={FolderXIcon}
          title={missing ? t('notFound.title') : t('errors.unexpected')}
          description={missing ? t('projects.notFound') : requestErrorMessage(project.error, t)}
        />
      </Page>
    );
  }
  return <Outlet />;
}
