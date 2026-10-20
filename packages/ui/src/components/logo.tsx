import { cn } from '../lib/cn.util.ts';

/** The Ticko mark: a ticket with a check, on the primary color. Decorative: pair it with visible text. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8 shrink-0', className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M9 11.5A1.5 1.5 0 0 1 10.5 10h11a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 9 20.5v-2a2.5 2.5 0 0 0 0-5Z"
        className="fill-none stroke-white"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="m13.25 16.25 1.9 1.9 3.6-3.9"
        className="fill-none stroke-white"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
