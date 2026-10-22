import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.util.ts';

/** Static class names, so Tailwind generates every tone. */
const TONES = {
  gray: 'bg-badge-gray text-badge-gray-foreground',
  blue: 'bg-badge-blue text-badge-blue-foreground',
  green: 'bg-badge-green text-badge-green-foreground',
  amber: 'bg-badge-amber text-badge-amber-foreground',
  violet: 'bg-badge-violet text-badge-violet-foreground',
  cyan: 'bg-badge-cyan text-badge-cyan-foreground',
  orange: 'bg-badge-orange text-badge-orange-foreground',
  pink: 'bg-badge-pink text-badge-pink-foreground',
} as const;

export type BadgeTone = keyof typeof TONES;

/** Static class names of the saturated color of each tone: dots and swatches. */
const SWATCHES: Readonly<Record<BadgeTone, string>> = {
  gray: 'bg-status-gray',
  blue: 'bg-status-blue',
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  violet: 'bg-status-violet',
  cyan: 'bg-status-cyan',
  orange: 'bg-status-orange',
  pink: 'bg-status-pink',
};

/** The background of a tone's dot or swatch, e.g. a status before its name. */
export function swatchClassName(tone: BadgeTone): string {
  return SWATCHES[tone];
}

/** The background and text colors of a tone, for marks that are not badges (a project's initials). */
export function toneClassName(tone: BadgeTone): string {
  return TONES[tone];
}

/** Classes of a badge, for elements that look like one (a select styled as a role badge). */
export function badgeClassName(tone: BadgeTone, className?: string): string {
  return cn(
    'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
    TONES[tone],
    className,
  );
}

/** A small colored label, e.g. a role. */
export function Badge({
  tone = 'gray',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return <span className={badgeClassName(tone, className)} {...props} />;
}
