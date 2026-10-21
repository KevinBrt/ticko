import type { AssignableRolesResponse } from '@toppo/shared';
import { cn, Input } from '@toppo/ui';
import { SearchIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import type { MemberFilter } from '../utils/member-filter.util.ts';

interface MemberFiltersProps {
  roles: AssignableRolesResponse['roles'];
  counts: ReadonlyMap<string, number>;
  total: number;
  filter: MemberFilter;
  onChange: (filter: MemberFilter) => void;
}

/** One tab per role with its head count, and a search box. Tabs scroll sideways on phones. */
export function MemberFilters({ roles, counts, total, filter, onChange }: MemberFiltersProps) {
  const { t } = useI18n();
  const tabs = [
    { roleId: null, label: t('members.all'), count: total },
    ...roles.map((role) => ({
      roleId: role.id,
      label: role.name,
      count: counts.get(role.id) ?? 0,
    })),
  ];

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 sm:flex-row sm:items-center sm:justify-between">
      {/* min-w-0: a fieldset otherwise refuses to shrink, and the tabs could not scroll. */}
      <fieldset className="-mb-px flex min-w-0 gap-5 overflow-x-auto">
        <legend className="sr-only">{t('members.filterLabel')}</legend>
        {tabs.map((tab) => {
          const selected = filter.roleId === tab.roleId;
          return (
            <button
              key={tab.roleId ?? 'all'}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...filter, roleId: tab.roleId })}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              <span className="rounded-full bg-surface-muted px-1.5 text-xs text-muted-foreground">
                {tab.count}
              </span>
            </button>
          );
        })}
      </fieldset>
      <div className="relative pb-3 sm:w-64 sm:py-2">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-5 left-3 size-4 -translate-y-1/2 text-muted-foreground sm:top-1/2"
        />
        <Input
          type="search"
          aria-label={t('members.search')}
          value={filter.search}
          placeholder={t('members.search')}
          onChange={(event) => onChange({ ...filter, search: event.target.value })}
          className="pl-9"
        />
      </div>
    </div>
  );
}
