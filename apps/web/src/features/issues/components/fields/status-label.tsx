import type { PaletteColor } from '@toppo/shared';
import { Badge, cn, swatchClassName } from '@toppo/ui';

/** A status as a pill: its dot and its name on its tint. */
export function StatusBadge({ status }: { status: { name: string; color: PaletteColor } }) {
  return (
    <Badge tone={status.color} className="max-w-full gap-1.5">
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', swatchClassName(status.color))}
      />
      <span className="truncate">{status.name}</span>
    </Badge>
  );
}

/** A status: its colored dot and its name. */
export function StatusLabel({ status }: { status: { name: string; color: PaletteColor } }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0 rounded-full', swatchClassName(status.color))}
      />
      <span className="truncate">{status.name}</span>
    </span>
  );
}
