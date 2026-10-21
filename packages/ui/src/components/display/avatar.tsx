import { cn } from '../../lib/cn.util.ts';

/** Up to two initials from a display name: "Ada Lovelace" → "AL". */
export function initialsOf(name: string): string {
  // Array.from splits by code point, so letters outside the BMP are never cut in half.
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  const first = words[0] ?? [];
  const last = words.length > 1 ? (words.at(-1) ?? []) : [];
  const initials = last.length > 0 ? [first[0], last[0]] : first.slice(0, 2);
  return initials.join('').toUpperCase();
}

/** Initials in a circle. Decorative: always shown next to the person's name. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground',
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
