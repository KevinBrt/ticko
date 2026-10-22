import { useId } from 'react';
import { cn } from '../../lib/cn.util.ts';
import { type BadgeTone, swatchClassName } from '../display/badge.tsx';

/**
 * Colors as round swatches: radio buttons, each named for screen readers. The group is named by
 * the element `labelledBy` points to.
 */
export function ColorPicker<Color extends BadgeTone>({
  labelledBy,
  colors,
  value,
  nameOf,
  onChange,
}: {
  labelledBy: string;
  colors: readonly Color[];
  value: Color;
  /** A color's name, in the reader's language. */
  nameOf: (color: Color) => string;
  onChange: (color: Color) => void;
}) {
  const name = useId();

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap gap-1">
      {colors.map((color) => (
        <label
          key={color}
          className="relative flex size-9 cursor-pointer items-center justify-center pointer-coarse:size-11"
        >
          <input
            type="radio"
            name={name}
            value={color}
            checked={value === color}
            onChange={() => onChange(color)}
            // Transparent over the swatch: clicked and focused where it is seen.
            className="peer absolute inset-0 cursor-pointer appearance-none opacity-0"
          />
          <span
            aria-hidden="true"
            className={cn(
              'size-5 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring',
              swatchClassName(color),
            )}
          />
          <span className="sr-only">{nameOf(color)}</span>
        </label>
      ))}
    </div>
  );
}
