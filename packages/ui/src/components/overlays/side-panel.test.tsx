import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Button } from '../button.tsx';
import { SidePanel, SidePanelClose, SidePanelContent, SidePanelTrigger } from './side-panel.tsx';

function Editor() {
  return (
    <SidePanel>
      <SidePanelTrigger asChild>
        <Button>Edit Category</Button>
      </SidePanelTrigger>
      <SidePanelContent
        title="Category"
        description="Issues keep theirs."
        closeLabel="Close"
        footer={
          <SidePanelClose asChild>
            <Button variant="secondary">Cancel</Button>
          </SidePanelClose>
        }
      >
        <input aria-label="Name" />
      </SidePanelContent>
    </SidePanel>
  );
}

describe('SidePanel', () => {
  it('opens a dialog named by its title and described by its sentence', async () => {
    const screen = await render(<Editor />);

    await screen.getByRole('button', { name: 'Edit Category' }).click();

    const panel = screen.getByRole('dialog', { name: 'Category' });
    await expect.element(panel).toBeVisible();
    await expect.element(panel).toHaveAccessibleDescription('Issues keep theirs.');
  });

  it('closes from its footer, and with Escape giving focus back to the trigger', async () => {
    const screen = await render(<Editor />);
    const trigger = screen.getByRole('button', { name: 'Edit Category' });
    await trigger.click();
    await screen.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();

    await trigger.click();
    await expect.element(screen.getByRole('dialog')).toBeVisible();
    await userEvent.keyboard('{Escape}');

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });
});
