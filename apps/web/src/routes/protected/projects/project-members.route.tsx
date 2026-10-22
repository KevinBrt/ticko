import { createRoute, useNavigate } from '@tanstack/react-router';
import type { ProjectMembersQuery } from '@toppo/shared';
import { useCallback } from 'react';
import { z } from 'zod';
import { ProjectMembersTable } from '../../../features/projects/components/members/project-members-table.tsx';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { projectSettingsRoute } from './project-settings.route.tsx';

/** The filters live in the URL: shareable, and kept by back and forward. Bad values are dropped. */
const membersSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const projectMembersRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: 'members',
  staticData: { titleKey: 'projectSettings.members' },
  validateSearch: membersSearchSchema,
  component: ProjectMembersScreen,
});

function ProjectMembersScreen() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: projectMembersRoute.fullPath });
  const { projectKey } = projectMembersRoute.useParams();
  const { q, page } = projectMembersRoute.useSearch();

  const changeQuery = useCallback(
    (next: ProjectMembersQuery) =>
      navigate({ search: { q: next.search || undefined, page: next.page }, replace: true }),
    [navigate],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('projectMembers.description')}</p>
      <ProjectMembersTable
        projectKey={projectKey}
        query={{ search: q, page }}
        onQueryChange={changeQuery}
      />
    </div>
  );
}
