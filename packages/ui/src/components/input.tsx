import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.util.ts';

export const inputClassName = cn(
  'flex h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-xs',
  'transition-colors placeholder:text-muted-foreground',
  'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/30',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/30',
  'pointer-coarse:h-11 pointer-coarse:text-base',
);

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(inputClassName, className)} {...props} />;
}
