import { useQuery } from '@tanstack/react-query';
import { createRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { can } from '@toppo/core';
import { GeneralSettings } from '../../../features/projects/components/settings/general-settings.tsx';
import { ProjectsQueries } from '../../../features/projects/queries/projects.queries.ts';
import { projectSettingsRoute } from './project-settings.route.tsx';

/** The general settings of a project; who only manages its members lands on them instead. */
export const projectGeneralRoute = createRoute({
  getParentRoute: () => projectSettingsRoute,
  path: '/',
  component: ProjectGeneralScreen,
});

function ProjectGeneralScreen() {
  const navigate = useNavigate();
  const { projectKey } = projectGeneralRoute.useParams();
  const { data: project } = useQuery(ProjectsQueries.detail(projectKey));

  if (!project) {
    return null;
  }
  if (!can(project.permissions, 'project.settings.manage')) {
    return <Navigate to="/projects/$projectKey/settings/members" params={{ projectKey }} replace />;
  }
  return (
    <GeneralSettings
      project={project}
      onKeyChanged={(key) =>
        navigate({
          to: '/projects/$projectKey/settings',
          params: { projectKey: key },
          replace: true,
        })
      }
    />
  );
}
