import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { BadgeSelect, type BadgeSelectOption } from './badge-select.tsx';

const ROLES: BadgeSelectOption[] = [
  { value: 'administrator', label: 'Administrator', tone: 'blue' },
  { value: 'team', label: 'Team', tone: 'green' },
];

function renderSelect(onValueChange = vi.fn(), value = 'team') {
  return render(
    <BadgeSelect
      aria-label="Role of Grace"
      options={ROLES}
      value={value}
      onValueChange={onValueChange}
    />,
  );
}

describe('BadgeSelect', () => {
  it('shows the current option, named after what it chooses', async () => {
    const screen = await renderSelect();

    const trigger = screen.getByRole('button', { name: 'Role of Grace, Team' });
    await expect.element(trigger).toHaveTextContent('Team');
    await expect.element(trigger).toHaveClass('bg-badge-green');
  });

  it('opens the options as a menu and reports the one chosen', async () => {
    const onValueChange = vi.fn();
    const screen = await renderSelect(onValueChange);

    await screen.getByRole('button', { name: 'Role of Grace, Team' }).click();
    await expect
      .element(screen.getByRole('menuitemradio', { name: 'Team' }))
      .toHaveAttribute('aria-checked', 'true');
    await screen.getByRole('menuitemradio', { name: 'Administrator' }).click();

    expect(onValueChange).toHaveBeenCalledWith('administrator');
  });

  it('says nothing when the current option is chosen again', async () => {
    const onValueChange = vi.fn();
    const screen = await renderSelect(onValueChange);

    await screen.getByRole('button', { name: 'Role of Grace, Team' }).click();
    await screen.getByRole('menuitemradio', { name: 'Team' }).click();

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('works with the keyboard', async () => {
    const onValueChange = vi.fn();
    const screen = await renderSelect(onValueChange);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect.element(screen.getByRole('menu')).toBeVisible();
    // Home: the first option, Administrator, whichever item had the focus.
    await userEvent.keyboard('{Home}{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('administrator');
  });
});
