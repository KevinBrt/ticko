import { randomInt } from 'node:crypto';
import { ADMIN } from './admin.ts';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

// The labels are one list for the whole instance: saved by one test at a time.
test('labels are created in the settings, given to an issue, filter the list, then deleted @instance', async ({
  page,
  baseURL,
}) => {
  const suffix = randomInt(36 ** 4).toString(36);
  const regression = `Regression ${suffix}`;
  const phones = `Phones ${suffix}`;
  await page.goto('/settings/properties');
  await page.getByRole('button', { name: /^Labels/ }).click();
  const panel = page.getByRole('dialog', { name: 'Labels' });
  for (const name of [regression, phones]) {
    await panel.getByRole('textbox', { name: 'New option' }).fill(name);
    await panel.getByRole('button', { name: 'Add', exact: true }).click();
  }
  await expectAccessible(page);
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel).toHaveCount(0);

  const key = `L${randomInt(36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')}`;
  const headers = { origin: baseURL ?? '' };
  expect(
    (
      await page.request.post('/api/v1/projects', { headers, data: { key, name: `Labels ${key}` } })
    ).status(),
  ).toBe(201);
  for (const title of ['Crash on phones', 'Invoices fail to download']) {
    expect(
      (
        await page.request.post(`/api/v1/projects/${key}/issues`, { headers, data: { title } })
      ).status(),
    ).toBe(201);
  }

  await page.goto(`/issues/${key}-1`);
  const field = page
    .getByRole('complementary', { name: 'Properties' })
    .getByRole('button', { name: /^Labels,/ });
  await field.click();
  await page.getByRole('menuitemcheckbox', { name: regression }).click();
  await page.getByRole('menuitemcheckbox', { name: phones }).click();
  await page.keyboard.press('Escape');
  // Chrome reads a space before each comma it is told: screen readers pause the same.
  await expect(field).toHaveAccessibleName(new RegExp(`^Labels, ${phones}\\s?, ${regression}$`));
  await expectAccessible(page);
  await expect(page.getByRole('region', { name: 'Activity' })).toContainText(
    `${ADMIN.name} added the labels ${phones} and ${regression}`,
  );

  await page.goto(`/issues?project=${key}`);
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: phones }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Crash on phones' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Invoices fail to download' })).toHaveCount(0);
  await expectAccessible(page);

  await page.goto('/settings/properties');
  await page.getByRole('button', { name: /^Labels/ }).click();
  await panel.getByRole('button', { name: `Remove ${phones}` }).click();
  await panel.getByRole('button', { name: `Remove ${regression}` }).click();
  await expect(panel).toContainText('Saving takes the labels you removed off 2 issues.');
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel).toHaveCount(0);

  await page.goto(`/issues/${key}-1`);
  await expect(field).toHaveAccessibleName('Labels, None');
});
