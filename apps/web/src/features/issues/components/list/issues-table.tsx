import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { IssueSummary } from '@toppo/shared';
import { Alert, Badge } from '@toppo/ui';
import type { ReactNode } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';
import { Pager } from '../../../../shared/layout/pager.tsx';
import { PersonName } from '../fields/person-name.tsx';
import { PriorityLabel } from '../fields/priority-label.tsx';
import { StatusLabel } from '../fields/status-label.tsx';

/** One page of issues as the server answers it. */
interface IssuesPage<Issue> {
  rows: Issue[];
  matching: number;
  page: number;
  pageSize: number;
}

/** The column a list ends with: who an issue goes to, or the project it belongs to. */
export interface LastColumn<Issue> {
  header: string;
  cell: (issue: Issue) => ReactNode;
}

/**
 * One page of issues as a table, each row opening its issue, with the way to the other pages.
 * Columns give way on small screens; the key, the subject and the status stay.
 */
export function IssuesTable<Issue extends IssueSummary>({
  issues,
  empty,
  last,
  onPage,
}: {
  issues: UseQueryResult<IssuesPage<Issue>>;
  /** Shown when there is no issue at all. */
  empty: ReactNode;
  last: LastColumn<Issue>;
  onPage: (page: number) => void;
}) {
  const { t, locale } = useI18n();

  if (issues.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('issues.loading')}
      </p>
    );
  }
  if (issues.isError) {
    return <Alert tone="danger">{requestErrorMessage(issues.error, t)}</Alert>;
  }
  const { rows, matching, page, pageSize } = issues.data;
  if (matching === 0) {
    return empty;
  }
  return (
    <section
      aria-busy={issues.isPlaceholderData}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
    >
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-20 py-2.5 pr-2 pl-4 font-medium sm:w-24">
              {t('issues.key')}
            </th>
            <th scope="col" className="px-2 py-2.5 font-medium">
              {t('issues.subject')}
            </th>
            <th scope="col" className="hidden w-40 px-2 py-2.5 font-medium xl:table-cell">
              {t('issues.reporter')}
            </th>
            <th scope="col" className="hidden w-36 px-2 py-2.5 font-medium lg:table-cell">
              {t('issues.category')}
            </th>
            <th scope="col" className="hidden w-32 px-2 py-2.5 font-medium md:table-cell">
              {t('issues.priority')}
            </th>
            <th scope="col" className="w-28 px-2 py-2.5 font-medium sm:w-40">
              {t('issues.status')}
            </th>
            <th scope="col" className="hidden w-44 py-2.5 pr-4 pl-2 font-medium lg:table-cell">
              {last.header}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((issue) => (
            <IssueRow key={issue.key} issue={issue} last={last} />
          ))}
        </tbody>
      </table>
      <Pager
        page={page}
        pageSize={pageSize}
        matching={matching}
        shown={rows.length}
        label={(count) => t(`issues.shown.${pluralForm(locale, count)}`, { count })}
        onPage={onPage}
      />
    </section>
  );
}

/** An issue, the whole row opening it: its subject is the link, stretched over the row. */
function IssueRow<Issue extends IssueSummary>({
  issue,
  last,
}: {
  issue: Issue;
  last: LastColumn<Issue>;
}) {
  return (
    <tr className="relative transition-colors hover:bg-surface-hover">
      <td className="py-3 pr-2 pl-4 font-mono text-xs font-medium text-muted-foreground">
        {issue.key}
      </td>
      <td className="px-2 py-3">
        <Link
          to="/issues/$issueKey"
          params={{ issueKey: issue.key }}
          className="line-clamp-2 font-medium break-words text-foreground outline-none after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring sm:line-clamp-1"
        >
          {issue.title}
        </Link>
      </td>
      <td className="hidden px-2 py-3 xl:table-cell">
        <PersonName person={issue.reporter} withAvatar={false} />
      </td>
      <td className="hidden px-2 py-3 lg:table-cell">
        <Badge tone={issue.category.color} className="max-w-full">
          <span className="truncate">{issue.category.name}</span>
        </Badge>
      </td>
      <td className="hidden px-2 py-3 md:table-cell">
        <PriorityLabel priority={issue.priority} />
      </td>
      <td className="px-2 py-3">
        <StatusLabel status={issue.status} />
      </td>
      <td className="hidden py-3 pr-4 pl-2 lg:table-cell">{last.cell(issue)}</td>
    </tr>
  );
}
