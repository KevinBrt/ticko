import type { PaletteColor } from '@toppo/shared';

/** The colors a project can take, in the order its settings offer them. */
export const PROJECT_COLORS = [
  'orange',
  'blue',
  'violet',
  'green',
  'pink',
  'amber',
  'cyan',
  'gray',
] as const satisfies readonly PaletteColor[];

/** Static class names, so Tailwind generates every swatch. */
export const SWATCH_CLASSES: Readonly<Record<PaletteColor, string>> = {
  gray: 'bg-status-gray',
  blue: 'bg-status-blue',
  green: 'bg-status-green',
  amber: 'bg-status-amber',
  violet: 'bg-status-violet',
  cyan: 'bg-status-cyan',
  orange: 'bg-status-orange',
  pink: 'bg-status-pink',
};
