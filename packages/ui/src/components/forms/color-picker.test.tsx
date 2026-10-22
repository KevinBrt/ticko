import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { StatusBadge } from '../display/status-badge.tsx';
import { ColorPicker } from './color-picker.tsx';

function Picker() {
  const [color, setColor] = useState<'blue' | 'pink'>('blue');
  return (
    <>
      <p id="label">Color</p>
      <ColorPicker
        labelledBy="label"
        colors={['blue', 'pink']}
        value={color}
        nameOf={(candidate) => (candidate === 'blue' ? 'Blue' : 'Pink')}
        onChange={setColor}
      />
      <StatusBadge status={{ name: 'In review', color }} />
    </>
  );
}

describe('ColorPicker', () => {
  it('offers each color as a named radio button of the group', async () => {
    const screen = await render(<Picker />);
    const group = screen.getByRole('radiogroup', { name: 'Color' });

    await expect.element(group.getByRole('radio', { name: 'Blue' })).toBeChecked();
    await group.getByRole('radio', { name: 'Pink' }).click();

    await expect.element(group.getByRole('radio', { name: 'Pink' })).toBeChecked();
    await expect.element(screen.getByText('In review')).toBeVisible();
  });
});
