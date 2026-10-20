import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from './button.tsx';

describe('Button', () => {
  it('is a non-submitting button by default', async () => {
    const screen = await render(<Button>Save</Button>);

    await expect
      .element(screen.getByRole('button', { name: 'Save' }))
      .toHaveAttribute('type', 'button');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    const screen = await render(<Button onClick={onClick}>Save</Button>);

    await screen.getByRole('button', { name: 'Save' }).click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('cannot be pressed when disabled', async () => {
    const screen = await render(<Button disabled>Save</Button>);

    await expect.element(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('lets callers override classes without duplicates', async () => {
    const screen = await render(
      <Button variant="ghost" className="text-danger">
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete' });

    await expect.element(button).toHaveClass('text-danger');
    await expect.element(button).not.toHaveClass('text-muted-foreground');
  });
});
