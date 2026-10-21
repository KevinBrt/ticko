import { ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.util.ts';
import { type BadgeTone, badgeClassName } from '../display/badge.tsx';

export interface BadgeSelectOption {
  value: string;
  label: string;
  tone: BadgeTone;
}

export interface BadgeSelectProps extends Omit<ComponentProps<'select'>, 'value' | 'onChange'> {
  options: readonly BadgeSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * A native select that looks like the badge of its current option, e.g. a member's role.
 * Native on purpose: keyboards, screen readers and phones handle it best.
 */
export function BadgeSelect({
  options,
  value,
  onValueChange,
  className,
  ...props
}: BadgeSelectProps) {
  const tone = options.find((option) => option.value === value)?.tone ?? 'gray';
  return (
    <span
      className={badgeClassName(
        tone,
        cn(
          'relative p-0 pointer-coarse:h-11',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
          className,
        ),
      )}
    >
      <select
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent pr-7 pl-2.5 outline-none disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-foreground">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
      />
    </span>
  );
}
