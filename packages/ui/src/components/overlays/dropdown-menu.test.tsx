import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu.tsx';

function Actions({ onDeactivate }: { onDeactivate: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Actions for Grace</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onDeactivate}>Deactivate</DropdownMenuItem>
        <DropdownMenuItem disabled>Reactivate</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('opens an accessible menu and runs the chosen action', async () => {
    const onDeactivate = vi.fn();
    const screen = await render(<Actions onDeactivate={onDeactivate} />);

    await screen.getByRole('button', { name: 'Actions for Grace' }).click();
    await screen.getByRole('menuitem', { name: 'Deactivate' }).click();

    expect(onDeactivate).toHaveBeenCalledOnce();
    await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
  });

  it('works with the keyboard and gives focus back to its trigger', async () => {
    const screen = await render(<Actions onDeactivate={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Actions for Grace' });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('menu')).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it('marks unavailable actions as disabled', async () => {
    const screen = await render(<Actions onDeactivate={vi.fn()} />);

    await screen.getByRole('button', { name: 'Actions for Grace' }).click();

    await expect
      .element(screen.getByRole('menuitem', { name: 'Reactivate' }))
      .toHaveAttribute('aria-disabled', 'true');
  });
});
