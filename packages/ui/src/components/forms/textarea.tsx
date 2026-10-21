import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.util.ts';
import { inputClassName } from './input.tsx';

/** A multi-line text field, styled like `Input`. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(inputClassName, 'h-auto min-h-24 py-2 leading-relaxed', className)}
      {...props}
    />
  );
}
