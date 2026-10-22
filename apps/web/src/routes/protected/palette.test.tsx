import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { rememberProject } from '../../features/issues/utils/last-project.util.ts';
import {
  ADA,
  fakeIssue,
  fakeProject,
  fakeServer,
  GRACE,
  memberOf,
  ROLE_BADGES,
  renderApp,
} from '../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
  rememberProject(null);
});

afterEach(() => {
  rememberProject(null);
});

/** Ada and Grace in WEB and API; an issue in each. */
function server(user = ADA) {
  const fake = fakeServer({
    user,
    projects: [
      fakeProject('WEB', 'Website', {
        members: [
          { userId: ADA.id, roleId: null },
          { userId: GRACE.id, roleId: null },
        ],
      }),
      fakeProject('API', 'Zeta API', {
        members: [
          { userId: ADA.id, roleId: null },
          { userId: GRACE.id, roleId: null },
        ],
      }),
    ],
    issues: [
      fakeIssue('WEB', 1, 'Broken link'),
      fakeIssue('API', 1, 'Rate limit too low', { description: 'Clients get 429 too soon.' }),
    ],
  });
  fake.state.users.push(memberOf(GRACE, ROLE_BADGES.team));
  return fake;
}

const palette = () => page.getByRole('dialog', { name: 'Search' });
const searchBox = () => palette().getByRole('combobox', { name: 'Search issues and pages' });
const option = (name: string | RegExp) => palette().getByRole('option', { name });

async function openPalette() {
  await expect.element(page.getByRole('heading', { level: 1 })).toBeVisible();
  await userEvent.keyboard('{Control>}k{/Control}');
  await expect.element(searchBox()).toHaveFocus();
}

describe('the search palette', () => {
  it('opens with Ctrl K or ⌘K from anywhere, and closes the same way', async () => {
    server();
    await renderApp({ path: '/issues?project=WEB' });

    await openPalette();
    await userEvent.keyboard('{Control>}k{/Control}');
    await expect.element(palette()).not.toBeInTheDocument();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await expect.element(palette()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(palette()).not.toBeInTheDocument();
  });

  it('opens from the top bar too, for a pointer or a finger', async () => {
    server();
    const { screen } = await renderApp({ path: '/my-issues' });

    await screen.getByRole('button', { name: 'Search' }).click();

    await expect.element(searchBox()).toHaveFocus();
  });

  it('offers the pages one may use and a new issue, before anything is typed', async () => {
    server(GRACE);
    await renderApp({ path: '/issues?project=WEB' });

    await openPalette();

    const names = palette()
      .getByRole('option')
      .elements()
      .map((element) => element.textContent);
    expect(names).toStrictEqual(['New issue', 'Issues', 'My issues']);
  });

  it('finds issues in every project as one types, and opens the one chosen', async () => {
    server();
    const { router } = await renderApp({ path: '/issues?project=WEB' });
    await openPalette();

    await userEvent.keyboard('429');
    await expect.element(option(/API-1.*Rate limit too low.*Zeta API/)).toBeVisible();
    await expect.element(option(/Broken link/)).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => router.state.location.pathname).toBe('/issues/API-1');
    await expect.element(palette()).not.toBeInTheDocument();
  });

  it('moves through the options with the arrows, the search box keeping the focus', async () => {
    server();
    const { router } = await renderApp({ path: '/issues?project=WEB' });
    await openPalette();

    await expect.element(option('New issue')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect.element(option('My issues')).toHaveAttribute('aria-selected', 'true');
    await expect
      .element(searchBox())
      .toHaveAttribute('aria-activedescendant', option('My issues').element().id);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    await expect.element(option('Settings')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => router.state.location.pathname).toBe('/settings/members');
  });

  it('opens an issue by its key at once, found or not', async () => {
    server();
    const { router } = await renderApp({ path: '/issues?project=WEB' });
    await openPalette();

    await userEvent.keyboard('zz-9');
    await expect.element(option('Open ZZ-9')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => router.state.location.pathname).toBe('/issues/ZZ-9');
  });

  it('says when nothing matches', async () => {
    server();
    await renderApp({ path: '/issues?project=WEB' });
    await openPalette();

    await userEvent.keyboard('nothing like this');

    await expect.element(palette().getByRole('status')).toHaveTextContent('No issue matches.');
    await expect.element(searchBox()).toHaveAttribute('aria-expanded', 'false');
  });
});
