import { useQuery } from '@tanstack/react-query';
import { createRoute, Link } from '@tanstack/react-router';
import { canAny } from '@toppo/core';
import { Alert, buttonVariants, EmptyState } from '@toppo/ui';
import { InboxIcon, SettingsIcon } from 'lucide-react';
import { ProjectsQueries } from '../../../features/projects/queries/projects.queries.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { projectRoute } from './project.route.tsx';

/** A project's home: its issues, and the way to its settings for those who manage it. */
export const projectHomeRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  component: ProjectHome,
});

function ProjectHome() {
  const { t } = useI18n();
  const { projectKey } = projectHomeRoute.useParams();
  const { data: project } = useQuery(ProjectsQueries.detail(projectKey));

  if (!project) {
    return null;
  }
  const manages = canAny(project.permissions, [
    'project.settings.manage',
    'project.members.manage',
  ]);
  return (
    <Page
      title={project.name}
      description={project.description || undefined}
      actions={
        manages ? (
          <Link
            to="/projects/$projectKey/settings"
            params={{ projectKey }}
            className={buttonVariants({ variant: 'secondary' })}
          >
            <SettingsIcon aria-hidden="true" />
            {t('projects.settings')}
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        {project.archived ? <Alert>{t('projects.archivedNotice')}</Alert> : null}
        <EmptyState
          icon={InboxIcon}
          title={t('projects.issuesEmptyTitle')}
          description={t('projects.issuesEmptyDescription')}
        />
      </div>
    </Page>
  );
}
