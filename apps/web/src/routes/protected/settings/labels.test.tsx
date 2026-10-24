import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { ADA, fakeIssue, fakeServer, renderApp } from '../../../test-helpers.tsx';

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

const panel = () => page.getByRole('dialog', { name: 'Labels' });
const labelsRow = () => page.getByRole('button', { name: /^Labels/ });

describe('the labels of the organization', () => {
  it('are listed among the properties, by name, several per issue', async () => {
    fakeServer({ user: ADA, labels: [MOBILE, BILLING] });
    await renderApp({ path: '/settings/properties' });

    await expect
      .element(
        page.getByRole('button', { name: /^Labels 2 options · billing, Mobile Several per issue/ }),
      )
      .toBeVisible();
  });

  it('are added, renamed and recolored, then saved at once', async () => {
    const fake = fakeServer({ user: ADA, labels: [MOBILE] });
    const { screen } = await renderApp({ path: '/settings/properties' });

    await labelsRow().click();
    await panel().getByRole('textbox', { name: 'Label 1' }).fill('Phones');
    await panel().getByRole('textbox', { name: 'New option' }).fill('Security');
    await panel().getByRole('button', { name: 'Add', exact: true }).click();
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: /^Labels 2 options · Phones, Security/ }))
      .toBeVisible();
    expect(fake.state.labels.map(({ name }) => name)).toStrictEqual(['Phones', 'Security']);
    await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  });

  it('say how many issues lose the labels removed, then take them off', async () => {
    const fake = fakeServer({
      user: ADA,
      labels: [MOBILE, BILLING],
      issues: [fakeIssue('WEB', 1, 'Crash', { labelIds: [MOBILE.id, BILLING.id] })],
    });
    await renderApp({ path: '/settings/properties' });

    await labelsRow().click();
    await expect.element(panel().getByText('1 issue', { exact: true }).first()).toBeVisible();
    await panel().getByRole('button', { name: 'Remove Mobile' }).click();
    await expect
      .element(panel().getByText('Saving takes the labels you removed off 1 issue.'))
      .toBeVisible();
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel()).not.toBeInTheDocument();
    expect(fake.state.issues[0]?.labelIds).toStrictEqual([BILLING.id]);
  });

  it('point at a name another label has, without saving', async () => {
    const fake = fakeServer({ user: ADA, labels: [MOBILE, BILLING] });
    await renderApp({ path: '/settings/properties' });

    await labelsRow().click();
    await panel().getByRole('textbox', { name: 'Label 2' }).fill('BILLING');
    await panel().getByRole('button', { name: 'Save' }).click();

    await expect.element(panel().getByText('Another option has this name.')).toBeVisible();
    expect(fake.requests.some(({ method }) => method === 'PUT')).toBe(false);
  });
});
