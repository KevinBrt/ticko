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
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label, control, help and error wired together: the label targets the control, and help and
 * error are announced by screen readers when the control is focused.
 */
export function Field({ label, description, error, className, children }: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
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
