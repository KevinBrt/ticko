import { ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.util.ts';
import { inputClassName } from './input.tsx';

/** A native select, styled like `Input`: keyboards, screen readers and phones handle it best. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select
        className={cn(inputClassName, 'cursor-pointer appearance-none pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
