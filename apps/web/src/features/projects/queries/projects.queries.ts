import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { ProjectMembersQuery, ProjectsQuery } from '@toppo/shared';
import { ProjectMembers } from '../api/project-members.api.ts';
import { Projects } from '../api/projects.api.ts';

/** Cached projects data. Keys start with `projects`. */
export const ProjectsQueries = {
  /** Everything about projects, to refresh it all after a change. */
  all: ['projects'] as const,
  /** One page of the list, as the server filtered it. The previous page stays while the next loads. */
  list: (query: ProjectsQuery) =>
    queryOptions({
      queryKey: ['projects', 'list', query],
      queryFn: () => Projects.list(query),
      placeholderData: keepPreviousData,
    }),
  detail: (key: string) =>
    queryOptions({
      queryKey: ['projects', 'detail', key],
      queryFn: () => Projects.get(key),
    }),
  /** Every cached page of a project's members, to refresh them after a change. */
  allMembers: (key: string) => ['projects', 'members', key] as const,
  members: (key: string, query: ProjectMembersQuery) =>
    queryOptions({
      queryKey: ['projects', 'members', key, query],
      queryFn: () => ProjectMembers.list(key, query),
      placeholderData: keepPreviousData,
    }),
  candidates: (key: string, search: string) =>
    queryOptions({
      queryKey: ['projects', 'candidates', key, search],
      queryFn: () => ProjectMembers.candidates(key, search),
      placeholderData: keepPreviousData,
    }),
  roles: (key: string) =>
    queryOptions({
      queryKey: ['projects', 'roles', key],
      queryFn: () => ProjectMembers.roles(key),
    }),
};
