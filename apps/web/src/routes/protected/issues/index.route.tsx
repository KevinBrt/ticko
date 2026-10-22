import { useQuery } from '@tanstack/react-query';
import { createRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { can } from '@toppo/core';
import type { IssuesQuery } from '@toppo/shared';
import { buttonVariants, EmptyState } from '@toppo/ui';
import { FolderXIcon, InboxIcon, PlusIcon } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { z } from 'zod';
import { IssuesList } from '../../../features/issues/components/list/issues-list.tsx';
import { lastProject, rememberProject } from '../../../features/issues/utils/last-project.util.ts';
import { ProjectsQueries } from '../../../features/projects/queries/projects.queries.ts';
import { ApiRequestError } from '../../../shared/api/http.client.ts';
import { requestErrorMessage } from '../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { issuesRoute } from './issues.route.tsx';

/** The project and the page live in the URL: shareable, kept by back and forward. */
const issuesSearchSchema = z.object({
  project: z.string().trim().max(10).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

/**
 * One project's issues. Without a project in the address, the one looked at last in this
 * browser, else the first the person reaches.
 */
export const issuesIndexRoute = createRoute({
  getParentRoute: () => issuesRoute,
  path: '/',
  validateSearch: issuesSearchSchema,
  beforeLoad: async ({ context, search }) => {
    if (search.project) {
      return;
    }
    const first = async () =>
      (await context.queryClient.fetchQuery(ProjectsQueries.list({}))).rows[0]?.key;
    const project = lastProject() ?? (await first());
    if (project) {
      throw redirect({ to: '/issues', search: { project }, replace: true });
    }
  },
  component: IssuesScreen,
});

function IssuesScreen() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: issuesIndexRoute.fullPath });
  const { project: projectKey, page } = issuesIndexRoute.useSearch();
  const project = useQuery({
    ...ProjectsQueries.detail(projectKey ?? ''),
    enabled: projectKey !== undefined,
  });
  const missing = project.error instanceof ApiRequestError && project.error.status === 404;

  // Remembered for next time; forgotten once out of reach, the first project shown instead.
  useEffect(() => {
    if (project.data) {
      rememberProject(project.data.key);
    } else if (missing) {
      rememberProject(null);
    }
  }, [project.data, missing]);

  const changeQuery = useCallback(
    (next: IssuesQuery) => navigate({ search: (previous) => ({ ...previous, page: next.page }) }),
    [navigate],
  );

  if (!projectKey) {
    return (
      <Page title={t('issues.title')}>
        <EmptyState
          icon={InboxIcon}
          title={t('issues.noProjectTitle')}
          description={t('issues.noProjectDescription')}
        />
      </Page>
    );
  }
  if (project.isError) {
    return (
      <Page title={t('issues.title')}>
        <EmptyState
          icon={FolderXIcon}
          title={missing ? t('notFound.title') : t('errors.unexpected')}
          description={missing ? t('projects.notFound') : requestErrorMessage(project.error, t)}
        />
      </Page>
    );
  }
  const permissions = project.data?.permissions ?? [];
  const newIssue = can(permissions, 'issue.create') ? (
    <Link to="/issues/new" search={{ project: projectKey }} className={buttonVariants()}>
      <PlusIcon aria-hidden="true" />
      {t('issues.newIssue')}
    </Link>
  ) : null;
  return (
    <Page title={t('issues.title')} actions={newIssue}>
      <IssuesList
        projectKey={projectKey}
        query={{ page }}
        canAssign={can(permissions, 'issue.assign')}
        empty={
          <EmptyState
            icon={InboxIcon}
            title={t('issues.emptyTitle')}
            description={t('issues.emptyDescription')}
          />
        }
        onQueryChange={changeQuery}
      />
    </Page>
  );
}
