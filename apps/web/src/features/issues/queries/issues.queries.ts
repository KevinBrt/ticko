import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { IssuesQuery, ProjectIssuesQuery } from '@toppo/shared';
import { Issues } from '../api/issues.api.ts';

/** Cached issues data. Keys start with `issues`. */
export const IssuesQueries = {
  /** Everything about issues, to refresh it all after a change. */
  all: ['issues'] as const,
  /** Every cached page of a project's issues. */
  allOf: (projectKey: string) => ['issues', 'list', projectKey] as const,
  /** One page of a project's issues. The previous page stays while the next loads. */
  list: (projectKey: string, query: ProjectIssuesQuery) =>
    queryOptions({
      queryKey: ['issues', 'list', projectKey, query],
      queryFn: () => Issues.list(projectKey, query),
      placeholderData: keepPreviousData,
    }),
  /** One page of the issues assigned to the signed-in person, in every project. */
  assigned: (query: IssuesQuery) =>
    queryOptions({
      queryKey: ['issues', 'assigned', query],
      queryFn: () => Issues.assigned(query),
      placeholderData: keepPreviousData,
    }),
  /** The issues a search finds in every project, nothing asked before anything is typed. */
  search: (text: string) =>
    queryOptions({
      queryKey: ['issues', 'search', text],
      queryFn: () => Issues.search(text),
      enabled: text !== '',
      placeholderData: keepPreviousData,
    }),
  detail: (key: string) =>
    queryOptions({
      queryKey: ['issues', 'detail', key],
      queryFn: () => Issues.get(key),
    }),
  activities: (key: string, page: number) =>
    queryOptions({
      queryKey: ['issues', 'activities', key, page],
      queryFn: () => Issues.activities(key, page),
      placeholderData: keepPreviousData,
    }),
  /** Short lists that change rarely: kept a while. */
  fields: (projectKey: string) =>
    queryOptions({
      queryKey: ['issues', 'fields', projectKey],
      queryFn: () => Issues.fields(projectKey),
      staleTime: 60_000,
    }),
  assignees: (projectKey: string, search: string) =>
    queryOptions({
      queryKey: ['issues', 'assignees', projectKey, search],
      queryFn: () => Issues.assignees(projectKey, search),
      placeholderData: keepPreviousData,
    }),
};
