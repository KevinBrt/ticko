import { useQuery } from '@tanstack/react-query';
import type { PaletteColor } from '@toppo/shared';
import { Alert } from '@toppo/ui';
import { useId, useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';
import { Pager } from '../../../../shared/layout/pager.tsx';
import { IssuesQueries } from '../../queries/issues.queries.ts';
import { groupHistory } from '../../utils/issue-history.util.ts';
import { HistoryItem } from './history-item.tsx';

/**
 * What happened to the issue, newest first, as a timeline: one circle per step on a line, changes
 * made together read as one.
 */
export function IssueHistory({
  issueKey,
  statuses,
}: {
  issueKey: string;
  /** The project's statuses, to show those named in the history in their colors. */
  statuses: readonly { id: string; color: PaletteColor }[];
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const [page, setPage] = useState(1);
  const history = useQuery(IssuesQueries.activities(issueKey, page));
  const statusColors = new Map(statuses.map(({ id, color }) => [id, color]));

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          {t('issues.history')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('issues.historyOrder')}</p>
      </div>
      {history.isError ? (
        <Alert tone="danger">{requestErrorMessage(history.error, t)}</Alert>
      ) : null}
      {history.data ? (
        <>
          <ol aria-busy={history.isPlaceholderData}>
            {groupHistory(history.data.rows).map((entry) => (
              <HistoryItem key={entry.id} entry={entry} statusColors={statusColors} />
            ))}
          </ol>
          {history.data.matching > history.data.pageSize ? (
            <Pager
              page={history.data.page}
              pageSize={history.data.pageSize}
              matching={history.data.matching}
              shown={history.data.rows.length}
              label={(count) => t(`issues.historyShown.${pluralForm(locale, count)}`, { count })}
              onPage={setPage}
            />
          ) : null}
        </>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {t('issues.historyLoading')}
        </p>
      )}
    </section>
  );
}
