import { cn } from '../../lib/cn.util.ts';
import { Badge, type BadgeTone, swatchClassName } from './badge.tsx';

/** A status as a pill: its dot and its name on its tint. */
export function StatusBadge({ status }: { status: { name: string; color: BadgeTone } }) {
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
