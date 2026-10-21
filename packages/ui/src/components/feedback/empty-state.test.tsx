import { InboxIcon } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../button.tsx';
import { EmptyState } from './empty-state.tsx';

describe('EmptyState', () => {
  it('shows a heading, a description and the optional action', async () => {
    const screen = await render(
      <EmptyState
        icon={InboxIcon}
        title="No issues yet"
        description="Issues will show up here."
        action={<Button>New issue</Button>}
      />,
    );

    await expect.element(screen.getByRole('heading', { name: 'No issues yet' })).toBeVisible();
    await expect.element(screen.getByText('Issues will show up here.')).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'New issue' })).toBeVisible();
  });

  it('hides the decorative icon from assistive technologies', async () => {
    const screen = await render(
      <EmptyState icon={InboxIcon} title="Empty" description="Nothing here." />,
    );

    expect(screen.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
