import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { ProjectsQuery } from '@toppo/shared';
import { Alert, cn, Input } from '@toppo/ui';
import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';
import { Pager } from '../../../../shared/layout/pager.tsx';
import { ProjectsQueries } from '../../queries/projects.queries.ts';

/** The search goes to the server once typing pauses, not on every key. */
const SEARCH_DELAY_MS = 300;

/**
 * One page of the projects the caller reaches, active or archived, as the server searched them.
 * Reports filter changes, for the caller to keep in the URL.
 */
export function ProjectsList({
  query,
  onQueryChange,
}: {
  query: ProjectsQuery;
  onQueryChange: (query: ProjectsQuery) => void;
}) {
  const { t, locale } = useI18n();
  const projects = useQuery(ProjectsQueries.list(query));
  const state = query.state ?? 'active';
  const search = query.search ?? '';
  const [typed, setTyped] = useState(search);

  // Follows the address bar too: back and forward change the search.
  useEffect(() => setTyped(search), [search]);

  useEffect(() => {
    if (typed.trim() === search) {
      return;
    }
    const timer = setTimeout(
      () => onQueryChange({ state, search: typed.trim() || undefined }),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed, search, state, onQueryChange]);

  if (projects.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('projects.loading')}
      </p>
    );
  }
  if (projects.isError) {
    return <Alert tone="danger">{requestErrorMessage(projects.error, t)}</Alert>;
  }

  const { rows, counts, matching, page, pageSize } = projects.data;
  const emptyMessage = () => {
    if (search) {
      return t('projects.noMatch');
    }
    return state === 'archived' ? t('projects.noArchived') : t('projects.emptyDescription');
  };
  const tabs = [
    { value: 'active', label: t('projects.active'), count: counts.active },
    { value: 'archived', label: t('projects.archived'), count: counts.archived },
  ] as const;
  return (
    <section
      aria-busy={projects.isPlaceholderData}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="-mb-px flex min-w-0 gap-5">
          <legend className="sr-only">{t('projects.stateLabel')}</legend>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={state === tab.value}
              onClick={() => onQueryChange({ state: tab.value, search: query.search })}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors',
                state === tab.value
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              <span className="rounded-full bg-surface-muted px-1.5 text-xs text-muted-foreground">
                {tab.count}
              </span>
            </button>
          ))}
        </fieldset>
        <div className="relative pb-3 sm:w-64 sm:py-2">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-5 left-3 size-4 -translate-y-1/2 text-muted-foreground sm:top-1/2"
          />
          <Input
            type="search"
            aria-label={t('projects.search')}
            value={typed}
            maxLength={100}
            placeholder={t('projects.search')}
            onChange={(event) => setTyped(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage()}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((project) => (
            <li key={project.id}>
              <Link
                to="/projects/$projectKey"
                params={{ projectKey: project.key }}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover pointer-coarse:min-h-11"
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {project.key}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {project.name}
                  </span>
                  {project.description ? (
                    <span className="block truncate text-sm text-muted-foreground">
                      {project.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={page}
        pageSize={pageSize}
        matching={matching}
        shown={rows.length}
        label={(count) => t(`projects.shown.${pluralForm(locale, count)}`, { count })}
        onPage={(next) => onQueryChange({ ...query, page: next })}
      />
    </section>
  );
}
