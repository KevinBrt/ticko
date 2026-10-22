import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { ADA, fakeIssue, fakeServer, GRACE, renderApp } from '../../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The body of the last request to `path`, as the fake server received it. */
function lastBody(fake: ReturnType<typeof fakeServer>, method: string, path: string): unknown {
  return fake.requests.findLast((request) => request.method === method && request.path === path)
    ?.body;
}

const panel = () => page.getByRole('dialog');
const option = (position: number) => panel().getByRole('textbox', { name: `Option ${position}` });

describe('the issue properties', () => {
  it('list Priority and Category with their options, highest priority first', async () => {
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Issue properties' }))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole('button', { name: /Priority 4 options · Urgent, High, Normal, Low/ }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole('button', { name: /Category 3 options · Bug, Request, Question/ }))
      .toBeVisible();
  });

  it('are kept from those who do not manage the settings', async () => {
    fakeServer({ user: GRACE });
    const { screen } = await renderApp({ path: '/settings/properties' });

    await expect
      .element(screen.getByRole('heading', { name: 'You do not have access to this page' }))
      .toBeVisible();
    await expect.element(screen.getByRole('button', { name: /Category/ })).not.toBeInTheDocument();
  });
});

describe('the categories', () => {
  it('are renamed, recolored, added to and given a default, then saved at once', async () => {
    const fake = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });

    await screen.getByRole('button', { name: /Category/ }).click();
    await expect.element(panel()).toHaveAccessibleName('Category');
    await option(1).fill('Defect');
    await panel().getByRole('button', { name: 'Color of Request: Gray' }).click();
    await screen.getByRole('menuitemradio', { name: 'Pink' }).click();
    await panel().getByRole('textbox', { name: 'New option' }).fill('Incident');
    await userEvent.keyboard('{Enter}');
    await panel().getByRole('combobox', { name: 'Default' }).selectOptions('Incident');
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    expect(lastBody(fake, 'PUT', '/api/v1/categories')).toStrictEqual({
      categories: [
        {
          id: '01a16286-f098-7e89-95b4-e2b2aa971d11',
          name: 'Defect',
          color: 'gray',
          isDefault: false,
        },
        {
          id: '01a16286-f098-7eba-93de-76873ba83fec',
          name: 'Request',
          color: 'pink',
          isDefault: false,
        },
        {
          id: '01a16286-f098-7082-a99d-9636cf947dea',
          name: 'Question',
          color: 'gray',
          isDefault: false,
        },
        { name: 'Incident', color: 'blue', isDefault: true },
      ],
      removed: [],
    });
    await expect
      .element(
        screen.getByRole('button', { name: /4 options · Defect, Request, Question, Incident/ }),
      )
      .toBeVisible();
  });

  it('are put in order by dragging a handle, with the keyboard too', async () => {
    const fake = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });
    await screen.getByRole('button', { name: /Category/ }).click();

    const handle = panel().getByRole('button', { name: 'Move Question' });
    await expect.element(handle).toBeVisible();
    handle.element().focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard(' ');
    await expect.element(option(1)).toHaveValue('Question');
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    expect(
      (
        lastBody(fake, 'PUT', '/api/v1/categories') as { categories: { name: string }[] }
      ).categories.map(({ name }) => name),
    ).toStrictEqual(['Question', 'Bug', 'Request']);
  });

  it('remove one no issue has, and keep one that issues have, saying how many do', async () => {
    const fake = fakeServer({ user: ADA, issues: [fakeIssue('WEB', 1, 'Broken link')] });
    const { screen } = await renderApp({ path: '/settings/properties' });
    await screen.getByRole('button', { name: /Category/ }).click();

    await expect.element(panel().getByRole('button', { name: 'Remove Request' })).toBeDisabled();
    await expect.element(panel().getByText('1 issue', { exact: true })).toBeVisible();
    await panel().getByRole('button', { name: 'Remove Question' }).click();
    await expect.element(option(3)).not.toBeInTheDocument();
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    expect(lastBody(fake, 'PUT', '/api/v1/categories')).toMatchObject({
      removed: ['01a16286-f098-7082-a99d-9636cf947dea'],
    });
    await expect
      .element(screen.getByRole('button', { name: /2 options · Bug, Request/ }))
      .toBeVisible();
  });

  it('point at a name another option has, without saving', async () => {
    const fake = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });
    await screen.getByRole('button', { name: /Category/ }).click();

    await option(3).fill('bug');
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(option(3)).toHaveAttribute('aria-invalid', 'true');
    await expect.element(option(3)).toHaveAccessibleDescription('Another option has this name.');
    expect(lastBody(fake, 'PUT', '/api/v1/categories')).toBeUndefined();
  });

  it('say so when someone changed them meanwhile', async () => {
    const fake = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });
    await screen.getByRole('button', { name: /Category/ }).click();
    fake.state.categories = fake.state.categories.slice(0, 2);

    await panel().getByRole('button', { name: 'Save' }).click();

    await expect
      .element(panel().getByRole('alert'))
      .toHaveTextContent(
        'Someone changed these options meanwhile. Close the panel and open it again.',
      );
  });
});

describe('the priorities', () => {
  it('are renamed and given a default, their four levels staying', async () => {
    const fake = fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/properties' });

    await screen.getByRole('button', { name: /Priority/ }).click();
    await expect.element(panel()).toHaveAccessibleName('Priority');
    await expect.element(option(1)).toHaveValue('Urgent');
    await option(2).fill('Important');
    await panel().getByRole('combobox', { name: 'Default' }).selectOptions('Urgent');
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    expect(
      (
        lastBody(fake, 'PUT', '/api/v1/priorities') as {
          priorities: { name: string; isDefault: boolean }[];
        }
      ).priorities.map(({ name, isDefault }) => [name, isDefault]),
    ).toStrictEqual([
      ['Urgent', true],
      ['Important', false],
      ['Normal', false],
      ['Low', false],
    ]);
    await expect
      .element(screen.getByRole('button', { name: /4 options · Urgent, Important, Normal, Low/ }))
      .toBeVisible();
  });
});
