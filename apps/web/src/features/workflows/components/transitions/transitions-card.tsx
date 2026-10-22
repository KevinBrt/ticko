import { useId, useState } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import type { WorkflowDraft } from '../../models/workflow-draft.model.ts';
import { toggleMove } from '../../utils/workflow-draft.util.ts';
import { ModeSwitch } from './mode-switch.tsx';
import { MovesSummary } from './moves-summary.tsx';
import { TransitionsGrid } from './transitions-grid.tsx';
import { TransitionsList } from './transitions-list.tsx';

/**
 * Which status may follow which: a grid of moves on wide screens, a list per status on phones, or
 * every move at once when the workflow is free.
 */
export function TransitionsCard({
  draft,
  readOnly,
  onChange,
}: {
  draft: WorkflowDraft;
  /** Only shown: a project following the instance's workflow. */
  readOnly: boolean;
  onChange: (draft: WorkflowDraft) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  // The row the summary tells about: the one last pointed at or focused.
  const [active, setActive] = useState<string | null>(null);
  const shown = draft.statuses.find(({ key }) => key === active) ?? draft.statuses[0] ?? null;
  const toggle = (from: string, to: string) => onChange(toggleMove(draft, from, to));

  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {t('workflow.workflow')}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t('workflow.workflowDescription')}
          </p>
        </div>
        <ModeSwitch
          value={draft.mode}
          disabled={readOnly}
          onChange={(mode) => onChange({ ...draft, mode })}
        />
      </div>
      {draft.mode === 'free' ? (
        <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
          {t('workflow.freeDescription')}
        </p>
      ) : (
        <>
          <div className="hidden border-t border-border md:block">
            <TransitionsGrid
              draft={draft}
              active={shown?.key ?? null}
              disabled={readOnly}
              onActive={setActive}
              onToggle={toggle}
            />
            {shown ? <MovesSummary draft={draft} status={shown} /> : null}
          </div>
          <div className="border-t border-border md:hidden">
            <TransitionsList draft={draft} disabled={readOnly} onToggle={toggle} />
          </div>
        </>
      )}
    </section>
  );
}
