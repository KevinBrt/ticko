import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SortableList, type SortableListMessages } from './sortable-list.tsx';

const MESSAGES: SortableListMessages = {
  move: (name) => `Move ${name}`,
  roleDescription: 'movable item',
  instructions: 'Press Space to pick it up.',
  picked: (name) => `Picked up ${name}.`,
  over: (name, position, count) => `${name} is at ${position} of ${count}.`,
  dropped: (name, position, count) => `${name} dropped at ${position} of ${count}.`,
  cancelled: (name) => `${name} is back.`,
};

function Fruits() {
  const [items, setItems] = useState([
    { key: 'a', name: 'Apple' },
    { key: 'b', name: 'Banana' },
    { key: 'c', name: 'Cherry' },
  ]);
  return (
    <SortableList
      items={items}
      nameOf={({ name }) => name}
      messages={MESSAGES}
      onReorder={setItems}
      renderItem={(item, handle) => (
        <p>
          {handle} {item.name}
        </p>
      )}
    />
  );
}

describe('SortableList', () => {
  it('gives each item a handle named after it, described as movable', async () => {
    const screen = await render(<Fruits />);

    const handle = screen.getByRole('button', { name: 'Move Banana' });
    await expect.element(handle).toHaveAttribute('aria-roledescription', 'movable item');
    await expect.element(handle).toHaveAccessibleDescription('Press Space to pick it up.');
  });

  it('moves an item with the keyboard, and says where it went', async () => {
    const screen = await render(<Fruits />);

    screen.getByRole('button', { name: 'Move Cherry' }).element().focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard(' ');

    await expect.element(screen.getByRole('listitem').nth(1)).toHaveTextContent('Cherry');
    await expect.element(screen.getByText('Cherry dropped at 2 of 3.')).toBeInTheDocument();
  });
});
