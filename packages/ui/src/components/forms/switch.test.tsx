import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Switch } from './switch.tsx';

function Notifications({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      aria-label="Email notifications"
      checked={on}
      disabled={disabled}
      onCheckedChange={setOn}
    />
  );
}

describe('Switch', () => {
  it('is a labelled switch that the keyboard turns on and off', async () => {
    const screen = await render(<Notifications />);
    const toggle = screen.getByRole('switch', { name: 'Email notifications' });

    await expect.element(toggle).not.toBeChecked();
    await userEvent.tab();
    await expect.element(toggle).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(toggle).toBeChecked();
    await userEvent.keyboard('{Enter}');
    await expect.element(toggle).not.toBeChecked();
    await toggle.click();
    await expect.element(toggle).toBeChecked();
  });

  it('cannot be turned on while disabled', async () => {
    const screen = await render(<Notifications disabled />);
    const toggle = screen.getByRole('switch', { name: 'Email notifications' });

    await expect.element(toggle).toBeDisabled();
    await toggle.click({ force: true });
    await expect.element(toggle).not.toBeChecked();
  });
});
