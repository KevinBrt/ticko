/** The colors a role, a status, a category or a project can take: presets of the design tokens. */
export const PALETTE_COLORS = [
  'gray',
  'blue',
  'green',
  'amber',
  'violet',
  'cyan',
  'orange',
  'pink',
] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];
