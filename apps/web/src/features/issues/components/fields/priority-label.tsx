import type { PriorityLevel } from '@toppo/shared';
import { cn } from '@toppo/ui';
import {
  type LucideIcon,
  SignalHighIcon,
  SignalIcon,
  SignalLowIcon,
  SignalMediumIcon,
} from 'lucide-react';

/** One more bar per level, each level its color: the icon says it before the word. */
const LEVELS: Readonly<Record<PriorityLevel, { icon: LucideIcon; className: string }>> = {
  1: { icon: SignalLowIcon, className: 'text-priority-low' },
  2: { icon: SignalMediumIcon, className: 'text-priority-normal' },
  3: { icon: SignalHighIcon, className: 'text-priority-high' },
  4: { icon: SignalIcon, className: 'text-priority-urgent' },
};

/** A priority: its bars and its name. */
export function PriorityLabel({ priority }: { priority: { name: string; level: PriorityLevel } }) {
  const { icon: Icon, className } = LEVELS[priority.level];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden="true" className={cn('size-4 shrink-0', className)} />
      <span className="truncate">{priority.name}</span>
    </span>
  );
}
