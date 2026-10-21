import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.util.ts';

export interface SwitchProps
  extends Omit<ComponentProps<'button'>, 'onChange' | 'role' | 'type' | 'value'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * An on/off control, as the ARIA switch pattern describes: a button that Space and Enter toggle,
 * announcing whether it is on. The whole padded box takes clicks: 44 px tall on touch screens.
 */
export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group inline-grid shrink-0 cursor-pointer p-1 outline-none pointer-coarse:p-3 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 h-5 w-9 rounded-full bg-border-strong transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring group-disabled:opacity-50 group-aria-checked:bg-primary"
      />
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 m-0.5 size-4 rounded-full bg-surface shadow-xs transition-transform group-aria-checked:translate-x-4"
      />
    </button>
  );
}
