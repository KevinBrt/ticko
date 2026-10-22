import { type ReactNode, useId } from 'react';
import { cn } from '../../lib/cn.util.ts';

/** Props a form control needs to be labelled and described accessibly. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}

export interface FieldProps {
  label: string;
  /** Help shown under the control, announced with it. */
  description?: string | undefined;
  /** Validation message; marks the control invalid. */
  error?: string | undefined;
  /**
   * `stacked` (default): label, control and help one under the other. `row`: label and help on
   * the left, the control on the right, from `sm` up, for settings shown as rows.
   */
  layout?: 'stacked' | 'row';
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label, control, help and error wired together: the label targets the control, and help and
 * error are announced by screen readers when the control is focused.
 */
export function Field({
  label,
  description,
  error,
  layout = 'stacked',
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');
  const control = children({
    id,
    'aria-invalid': Boolean(error),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  });

  if (layout === 'row') {
    return (
      <div
        className={cn(
          'grid gap-x-8 gap-y-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-start',
          className,
        )}
      >
        <div className="flex flex-col gap-0.5 sm:pt-2">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {description ? (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          {control}
          {error ? (
            <p id={errorId} className="text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {control}
      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
