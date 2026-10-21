import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { BadgeSelect, type BadgeSelectOption } from './badge-select.tsx';

const ROLES: BadgeSelectOption[] = [
  { value: 'administrator', label: 'Administrator', tone: 'blue' },
  { value: 'team', label: 'Team', tone: 'green' },
];

describe('BadgeSelect', () => {
  it('is a labelled native select that reports the chosen value', async () => {
    const onValueChange = vi.fn();
    const screen = await render(
      <BadgeSelect
        aria-label="Role of Grace"
        options={ROLES}
        value="team"
        onValueChange={onValueChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Role of Grace' });

    await expect.element(select).toHaveValue('team');
    await select.selectOptions('Administrator');

    expect(onValueChange).toHaveBeenCalledWith('administrator');
  });

  it('takes the color of the current option', async () => {
    const screen = await render(
      <BadgeSelect
        aria-label="Role"
        options={ROLES}
        value="administrator"
        onValueChange={vi.fn()}
      />,
    );

    await expect
      .element(screen.getByRole('combobox', { name: 'Role' }).element().parentElement)
      .toHaveClass('bg-badge-blue');
  });
});
