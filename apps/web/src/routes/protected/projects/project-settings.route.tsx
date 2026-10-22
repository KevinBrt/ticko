import { useQuery } from '@tanstack/react-query';
import { createRoute, Link, Outlet } from '@tanstack/react-router';
import { can } from '@toppo/core';
import { cn } from '@toppo/ui';
import { ProjectsQueries } from '../../../features/projects/queries/projects.queries.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { AccessDenied } from '../../../shared/layout/access-denied.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { projectRoute } from './project.route.tsx';

/** A project's settings, for those who manage it: its general settings, its members. */
export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'settings',
  staticData: { titleKey: 'projectSettings.title' },
  component: ProjectSettingsLayout,
});

const TAB_CLASS =
  '-mb-px flex min-h-11 shrink-0 items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground';

function ProjectSettingsLayout() {
  const { t } = useI18n();
  const { projectKey } = projectSettingsRoute.useParams();
  const { data: project } = useQuery(ProjectsQueries.detail(projectKey));

  if (!project) {
    return null;
  }
  const general = can(project.permissions, 'project.settings.manage');
  const members = can(project.permissions, 'project.members.manage');
  return (
    <Page title={t('projectSettings.title')} description={project.name}>
      {general || members ? (
        <div className="flex flex-col gap-5">
          <nav
            aria-label={t('projectSettings.navLabel')}
            className="flex gap-5 border-b border-border"
          >
            {general ? (
              <Link
                to="/projects/$projectKey/settings"
                params={{ projectKey }}
                activeOptions={{ exact: true }}
                className={cn(TAB_CLASS)}
              >
                {t('projectSettings.general')}
              </Link>
            ) : null}
            {members ? (
              <Link
                to="/projects/$projectKey/settings/members"
                params={{ projectKey }}
                className={TAB_CLASS}
              >
                {t('projectSettings.members')}
              </Link>
            ) : null}
          </nav>
          <Outlet />
        </div>
      ) : (
        <AccessDenied />
      )}
    </Page>
  );
}
