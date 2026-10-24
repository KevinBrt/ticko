import { beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  ADA,
  fakeIssue,
  fakeProject,
  fakeServer,
  GRACE,
  memberOf,
  ROLE_BADGES,
  renderApp,
} from '../../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

const MOBILE = {
  id: '01a1569b-9900-7000-8000-000000001101',
  name: 'Mobile',
  color: 'blue',
} as const;
const BILLING = {
  id: '01a1569b-9900-7000-8000-000000001102',
  name: 'billing',
  color: 'green',
} as const;
const SECURITY = {
  id: '01a1569b-9900-7000-8000-000000001103',
  name: 'Security',
  color: 'pink',
} as const;

/** WEB-1 tagged Mobile, WEB-2 without labels, seen by `user`. */
function server(user = ADA, { labels: given = [MOBILE, BILLING, SECURITY] } = {}) {
  const fake = fakeServer({
    user,
    labels: given,
    projects: [
      fakeProject('WEB', 'Website', {
        members: [
          { userId: ADA.id, roleId: null },
          { userId: GRACE.id, roleId: null },
        ],
      }),
    ],
    issues: [
      fakeIssue('WEB', 1, 'Crash on phones', { labelIds: [MOBILE.id] }),
      fakeIssue('WEB', 2, 'Invoices fail to download'),
    ],
  });
  fake.state.users.push(memberOf(GRACE, ROLE_BADGES.team));
  return fake;
}

const properties = () => page.getByRole('complementary', { name: 'Properties' });
const field = () => properties().getByRole('button', { name: /^Labels,/ });

describe('the labels of an issue', () => {
  it('are chosen in a menu that stays open, saved once it closes', async () => {
    const fake = server();
    const { screen } = await renderApp({ path: '/issues/WEB-1' });

    await expect.element(field()).toHaveAccessibleName('Labels, Mobile');
    await field().click();
    await screen.getByRole('menuitemcheckbox', { name: 'Security' }).click();
    await screen.getByRole('menuitemcheckbox', { name: 'Mobile' }).click();
    await screen.getByRole('menuitemcheckbox', { name: 'billing' }).click();
    expect(fake.requests.some(({ method }) => method === 'PUT')).toBe(false);
    await userEvent.keyboard('{Escape}');

    // Chrome reads a space before each comma it is told: screen readers pause the same.
    await expect.element(field()).toHaveAccessibleName(/^Labels, billing\s?, Security$/);
    expect(fake.requests.filter(({ method }) => method === 'PUT')).toStrictEqual([
      {
        method: 'PUT',
        path: '/api/v1/issues/WEB-1/labels',
        body: { labelIds: [BILLING.id, SECURITY.id] },
      },
    ]);
    const activity = screen.getByRole('region', { name: 'Activity' });
    await expect
      .element(
        activity.getByText(
          'Ada Lovelace added the labels billing and Security and removed the label Mobile',
          { exact: false },
        ),
      )
      .toBeVisible();
  });

  it('are only shown to whoever may not change the issue’s fields', async () => {
    const fake = server(GRACE);
    fake.state.projects[0]?.members.splice(1, 1, {
      userId: GRACE.id,
      roleId: ROLE_BADGES.requester.id,
    });
    fake.state.issues[0] = fakeIssue('WEB', 1, 'Crash on phones', {
      labelIds: [MOBILE.id],
      reporterId: GRACE.id,
    });
    await renderApp({ path: '/issues/WEB-1' });

    await expect.element(properties().getByText('Mobile')).toBeVisible();
    await expect.element(field()).not.toBeInTheDocument();
  });

  it('say there are none yet, and where to create them', async () => {
    server(ADA, { labels: [] });
    const { screen } = await renderApp({ path: '/issues/WEB-2' });

    await expect.element(field()).toHaveAccessibleName('Labels, None');
    await field().click();
    await expect
      .element(
        screen.getByRole('menuitem', { name: 'No labels yet: create them in the settings.' }),
      )
      .toBeVisible();
  });
});

describe('labels in the list', () => {
  it('show beside each issue, and filter the list', async () => {
    const fake = server();
    const { screen, router } = await renderApp({ path: '/issues?project=WEB' });

    const crash = screen.getByRole('row').filter({ hasText: 'Crash on phones' });
    await expect.element(crash.getByRole('list', { name: 'Labels' })).toHaveTextContent('Mobile');
    await screen.getByRole('button', { name: 'Labels', exact: true }).click();
    await screen.getByRole('menuitemcheckbox', { name: 'Mobile' }).click();
    await userEvent.keyboard('{Escape}');

    await expect
      .element(screen.getByRole('link', { name: 'Invoices fail to download' }))
      .not.toBeInTheDocument();
    expect(router.state.location.search).toMatchObject({ label: MOBILE.id });
    expect(fake.requests.at(-1)?.path).toContain(`label=${MOBILE.id}`);
  });
});
