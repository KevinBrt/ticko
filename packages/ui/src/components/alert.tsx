import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.util.ts';

export interface AlertProps {
  tone?: 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

/** A message about the current task. Danger alerts are announced as soon as they appear. */
export function Alert({ tone = 'info', children, className }: AlertProps) {
  const Icon = tone === 'danger' ? CircleAlertIcon : InfoIcon;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        tone === 'danger'
          ? 'border-danger/25 bg-danger-subtle text-danger-hover'
          : 'border-primary/20 bg-primary-subtle text-primary-subtle-foreground',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
