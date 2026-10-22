/** The colors a role, a status or a category can take: presets of the design tokens. */
export const PALETTE_COLORS = ['gray', 'blue', 'green', 'amber', 'violet', 'cyan'] as const;

export type PaletteColor = (typeof PALETTE_COLORS)[number];
