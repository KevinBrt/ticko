import {
  type LucideIcon,
  SignalHighIcon,
  SignalIcon,
  SignalLowIcon,
  SignalMediumIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn.util.ts';

/** The four priority levels, lowest first. */
export type PriorityIconLevel = 1 | 2 | 3 | 4;

/** One more bar per level, each level its color: the icon says it before the word. */
const LEVELS: Readonly<Record<PriorityIconLevel, { icon: LucideIcon; className: string }>> = {
  1: { icon: SignalLowIcon, className: 'text-priority-low' },
  2: { icon: SignalMediumIcon, className: 'text-priority-normal' },
  3: { icon: SignalHighIcon, className: 'text-priority-high' },
  4: { icon: SignalIcon, className: 'text-priority-urgent' },
};

/** A priority level's bars in its color. Hidden from screen readers: the level's name says it. */
export function PriorityIcon({
  level,
  className,
}: {
  level: PriorityIconLevel;
  className?: string;
}) {
  const { icon: Icon, className: tone } = LEVELS[level];
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', tone, className)} />;
}
