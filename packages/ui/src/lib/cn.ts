import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and resolves Tailwind conflicts, so a `className` prop can override defaults. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
