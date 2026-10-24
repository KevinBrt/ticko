import type { CategoryRow, LabelRow, PriorityRow } from '@toppo/shared';
import { ChevronRightIcon, ListIcon, TagsIcon } from 'lucide-react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';

export type BuiltInProperty = 'priority' | 'category' | 'labels';

/**
 * The properties of the whole organization, each opening its panel: for now Priority and
 * Category, two lists of options every project uses, and the labels.
 */
export function PropertiesList({
  categories,
  priorities,
  labels,
  onEdit,
}: {
  categories: readonly CategoryRow[];
  priorities: readonly PriorityRow[];
  labels: readonly LabelRow[];
  onEdit: (property: BuiltInProperty) => void;
}) {
  const { t, locale } = useI18n();
  const rows: { property: BuiltInProperty; name: string; type: string; options: string[] }[] = [
    {
      property: 'priority',
      name: t('properties.priority'),
      type: t('properties.optionList'),
      // The highest level first, as people rank them.
      options: priorities.toReversed().map(({ name }) => name),
    },
    {
      property: 'category',
      name: t('properties.category'),
      type: t('properties.optionList'),
      options: categories.map(({ name }) => name),
    },
    {
      property: 'labels',
      name: t('properties.labels'),
      type: t('properties.labelList'),
      options: labels.map(({ name }) => name),
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <h2>
          <span className="font-medium text-foreground">{t('properties.global')}</span>
          {' · '}
          {t('properties.globalHint')}
        </h2>
        <span aria-hidden="true" className="hidden w-40 sm:block">
          {t('properties.type')}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ property, name, type, options }) => (
          <li key={property}>
            <button
              type="button"
              onClick={() => onEdit(property)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"
              >
                {property === 'labels' ? (
                  <TagsIcon className="size-4" />
                ) : (
                  <ListIcon className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {options.length === 0
                    ? t('properties.noLabels')
                    : t('properties.summary', {
                        options: t(`properties.options.${pluralForm(locale, options.length)}`, {
                          count: options.length,
                        }),
                        names: options.join(', '),
                      })}
                </span>
              </span>
              <span className="hidden w-40 shrink-0 text-sm text-foreground sm:block">{type}</span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
