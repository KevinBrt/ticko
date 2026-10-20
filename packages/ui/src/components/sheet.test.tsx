import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from './button.tsx';
import { Sheet, SheetContent, SheetTrigger } from './sheet.tsx';

function Drawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open menu</Button>
      </SheetTrigger>
      <SheetContent title="Main navigation" closeLabel="Close menu">
        <a href="#issues">Issues</a>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('opens an accessible dialog named by its title', async () => {
    const screen = await render(<Drawer />);

    await screen.getByRole('button', { name: 'Open menu' }).click();

    await expect.element(screen.getByRole('dialog', { name: 'Main navigation' })).toBeVisible();
  });

  it('closes with the close button', async () => {
    const screen = await render(<Drawer />);
    await screen.getByRole('button', { name: 'Open menu' }).click();

    await screen.getByRole('button', { name: 'Close menu' }).click();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape and gives focus back to the trigger', async () => {
    const screen = await render(<Drawer />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await trigger.click();
    await expect.element(screen.getByRole('dialog')).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it('keeps keyboard focus inside while open', async () => {
    const screen = await render(<Drawer />);
    await screen.getByRole('button', { name: 'Open menu' }).click();

    for (let i = 0; i < 4; i++) {
      await userEvent.tab();
      const focused = document.activeElement;
      expect(screen.getByRole('dialog').element().contains(focused)).toBe(true);
    }
  });
});
