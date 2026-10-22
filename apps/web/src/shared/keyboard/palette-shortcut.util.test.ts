import { describe, expect, it } from 'vitest';
import { isPaletteShortcut, paletteShortcutLabel } from './palette-shortcut.util.ts';

const keys = { key: 'k', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };

describe('isPaletteShortcut', () => {
  it('opens the palette with ⌘K or Ctrl K, whatever the case', () => {
    expect(isPaletteShortcut({ ...keys, metaKey: true })).toBe(true);
    expect(isPaletteShortcut({ ...keys, ctrlKey: true })).toBe(true);
    expect(isPaletteShortcut({ ...keys, key: 'K', ctrlKey: true })).toBe(true);
  });

  it('leaves K alone, and other combinations', () => {
    expect(isPaletteShortcut(keys)).toBe(false);
    expect(isPaletteShortcut({ ...keys, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(isPaletteShortcut({ ...keys, ctrlKey: true, altKey: true })).toBe(false);
    expect(isPaletteShortcut({ ...keys, key: 'j', ctrlKey: true })).toBe(false);
  });
});

describe('paletteShortcutLabel', () => {
  it('writes the shortcut as the keyboard does', () => {
    expect(paletteShortcutLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')).toBe('⌘K');
    expect(paletteShortcutLabel('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('⌘K');
    expect(paletteShortcutLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Ctrl K');
  });
});
