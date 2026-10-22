import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button.tsx';
import { Dialog, DialogContent, DialogTrigger } from './dialog.tsx';

function Invite() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Invite members</Button>
      </DialogTrigger>
      <DialogContent
        title="Invite members"
        description="They get a link to choose a password."
        closeLabel="Close"
      >
        <input aria-label="Emails" />
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('opens a modal dialog named and described by its title and description', async () => {
    const screen = await render(<Invite />);

    await screen.getByRole('button', { name: 'Invite members' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Invite members' });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(dialog)
      .toHaveAccessibleDescription('They get a link to choose a password.');
  });

  it('closes with Escape and gives focus back to the trigger', async () => {
    const screen = await render(<Invite />);
    const trigger = screen.getByRole('button', { name: 'Invite members' });
    await trigger.click();

    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });
});

describe('Dialog with its title hidden', () => {
  it('is still named by its title, read but not shown', async () => {
    const screen = await render(
      <Dialog defaultOpen>
        <DialogContent title="Search" closeLabel="Close" hideTitle>
          <input aria-label="Search issues" />
        </DialogContent>
      </Dialog>,
    );

    await expect.element(screen.getByRole('dialog', { name: 'Search' })).toBeVisible();
    // Visually hidden: the styles of the application keep it for screen readers only.
    await expect.element(screen.getByText('Search', { exact: true })).toHaveClass('sr-only');
  });
});
