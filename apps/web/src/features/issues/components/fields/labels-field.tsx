import type { LabelRef } from '@toppo/shared';
import {
  Badge,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@toppo/ui';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { FIELD_TRIGGER_CLASS } from './field-menu.tsx';
import { LabelChips } from './label-chips.tsx';

/**
 * An issue's labels, chosen in a menu of the instance's, several at once: the menu stays open
 * while one chooses, and the choice is saved once, when it closes. Disabled, it only shows them.
 */
export function LabelsField({
  labels,
  options,
  disabled,
  onChange,
}: {
  labels: readonly LabelRef[];
  /** Every label of the instance, by name. */
  options: readonly LabelRef[];
  disabled: boolean;
  onChange: (labels: LabelRef[]) => void;
}) {
  const { t } = useI18n();
  // What the open menu has chosen so far; nothing while it is closed.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const shown =
    labels.length > 0 ? (
      <LabelChips labels={labels} />
    ) : (
      <span className="text-muted-foreground">{t('issues.noLabels')}</span>
    );

  if (disabled) {
    return shown;
  }
  const close = () => {
    if (chosen === null) {
      return;
    }
    const before = labels.map(({ id }) => id);
    const changed = chosen.length !== before.length || chosen.some((id) => !before.includes(id));
    setChosen(null);
    if (changed) {
      onChange(options.filter(({ id }) => chosen.includes(id)));
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => (open ? setChosen(labels.map(({ id }) => id)) : close())}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={FIELD_TRIGGER_CLASS}>
          {/* Named by what it shows, "Labels, Mobile, Billing", the commas read only. */}
          <span className="sr-only">{t('issues.labels')}, </span>
          <span className="flex min-w-0 flex-wrap gap-1 py-1">
            {labels.length === 0 ? (
              <span className="text-muted-foreground">{t('issues.noLabels')}</span>
            ) : null}
            {labels.map((label, index) => (
              <Badge key={label.id} tone={label.color} className="h-5 max-w-40 px-2">
                <span className="truncate">
                  {label.name}
                  {index < labels.length - 1 ? <span className="sr-only">,</span> : null}
                </span>
              </Badge>
            ))}
          </span>
          <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={chosen?.includes(option.id) ?? false}
            onCheckedChange={(checked) =>
              setChosen((current) => {
                const rest = (current ?? []).filter((id) => id !== option.id);
                return checked ? [...rest, option.id] : rest;
              })
            }
            onSelect={(event) => event.preventDefault()}
          >
            <Badge tone={option.color}>{option.name}</Badge>
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 ? (
          <DropdownMenuItem disabled>{t('issues.labelsEmpty')}</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
