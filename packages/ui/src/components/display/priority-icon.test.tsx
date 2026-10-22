import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { PriorityIcon } from './priority-icon.tsx';

describe('PriorityIcon', () => {
  it('draws each level in its own color, hidden from screen readers', async () => {
    const screen = await render(
      <p>
        <PriorityIcon level={1} />
        <PriorityIcon level={4} />
      </p>,
    );

    const [low, urgent] = screen.container.querySelectorAll('svg');
    expect(low?.getAttribute('aria-hidden')).toBe('true');
    expect(low?.classList.contains('text-priority-low')).toBe(true);
    expect(urgent?.classList.contains('text-priority-urgent')).toBe(true);
  });
});
