/** The keys of a keyboard event that tell a shortcut. */
export type ShortcutKeys = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
>;

/**
 * Whether keys open the search palette: ⌘K on Apple devices, Ctrl K elsewhere, either accepted
 * everywhere, so that a Mac keyboard on Linux or a PC keyboard on a Mac work too.
 */
export function isPaletteShortcut({
  key,
  metaKey,
  ctrlKey,
  altKey,
  shiftKey,
}: ShortcutKeys): boolean {
  return key.toLowerCase() === 'k' && (metaKey || ctrlKey) && !altKey && !shiftKey;
}

/** The shortcut as the person's keyboard writes it: `⌘K` on Apple devices, `Ctrl K` elsewhere. */
export function paletteShortcutLabel(userAgent: string): string {
  return /Mac|iPhone|iPad/.test(userAgent) ? '⌘K' : 'Ctrl K';
}
