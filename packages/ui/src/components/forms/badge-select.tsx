import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../lib/cn.util.ts';
import { Badge, type BadgeTone, badgeClassName } from '../display/badge.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../overlays/dropdown-menu.tsx';

export interface BadgeSelectOption {
  value: string;
  label: string;
  tone: BadgeTone;
}

export interface BadgeSelectProps {
  options: readonly BadgeSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** What the choice is about, e.g. "Role of Grace": the current option is read after it. */
  'aria-label': string;
  disabled?: boolean;
  className?: string;
}

/**
 * The badge of the current option, opening a menu of the others: a member's role, a status.
 * A Radix menu: arrow keys, typeahead and Escape work, and the choice is a radio item.
 */
export function BadgeSelect({
  options,
  value,
  onValueChange,
  'aria-label': label,
  disabled = false,
  className,
}: BadgeSelectProps) {
  const current = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={current ? `${label}, ${current.label}` : label}
          className={badgeClassName(
            current?.tone ?? 'gray',
            cn(
              'max-w-full cursor-pointer pr-1.5 outline-none pointer-coarse:h-11',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:ring-2 data-[state=open]:ring-ring/30',
              className,
            ),
          )}
        >
          <span className="truncate">{current?.label}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => (next === value ? undefined : onValueChange(next))}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <Badge tone={option.tone}>{option.label}</Badge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
