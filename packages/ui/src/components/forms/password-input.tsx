import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { cn } from '../../lib/cn.util.ts';
import { inputClassName } from './input.tsx';

export interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  showLabel: string;
  hideLabel: string;
}

/** A password field with a button to reveal what was typed, helpful on phones. */
export function PasswordInput({ showLabel, hideLabel, className, ...props }: PasswordInputProps) {
  const [isVisible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={isVisible ? 'text' : 'password'}
        className={cn(inputClassName, 'pr-11', className)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((visible) => !visible)}
        aria-label={isVisible ? hideLabel : showLabel}
        aria-pressed={isVisible}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground pointer-coarse:w-11"
      >
        {isVisible ? (
          <EyeOffIcon aria-hidden="true" className="size-4" />
        ) : (
          <EyeIcon aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
