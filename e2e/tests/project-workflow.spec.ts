import { randomInt } from 'node:crypto';
import { expect, expectAccessible, test } from './fixtures.ts';

test.use({ locale: 'en-US' });

test('a project gets a workflow of its own, an issue moves to its status, then it goes back', async ({
  page,
  baseURL,
}) => {
  const key = `F${randomInt(36 ** 5)
    .toString(36)
    .toUpperCase()
    .padStart(5, '0')}`;
  const headers = { origin: baseURL ?? '' };
  expect(
    (
      await page.request.post('/api/v1/projects', { headers, data: { key, name: `Flow ${key}` } })
    ).status(),
  ).toBe(201);
  expect(
    (
      await page.request.post(`/api/v1/projects/${key}/issues`, {
        headers,
        data: { title: 'Check the invoices' },
      })
    ).status(),
  ).toBe(201);
  const status = (name: string) =>
    page
      .getByRole('main')
      .getByRole('button', { name: `Status, ${name}` })
      .first();

  await page.goto(`/projects/${key}/statuses`);
  await expect(page.getByText('This project follows the organization’s workflow')).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Customize for this project' }).click();
  await expect(page.getByText('This project has a workflow of its own')).toBeVisible();

  await page.getByRole('button', { name: 'Add a status' }).click();
  const dialog = page.getByRole('dialog', { name: 'New status' });
  await dialog.getByLabel('Name').fill('Review');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  // Free: any status may follow any other, whatever the screen shows of the moves.
  await page.getByText('Free', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Workflow saved.')).toBeVisible();

  await page.goto(`/issues/${key}-1`);
  await status('New').click();
  await page.getByRole('menuitemradio', { name: 'Review', exact: true }).click();
  await expect(status('Review')).toBeVisible();
  // Shown at once, saved once the activity lists it: leaving earlier would cancel the request.
  await expect(
    page.getByRole('region', { name: 'Activity' }).getByRole('listitem').first(),
  ).toContainText('changed the status New to Review');

  await page.goto(`/projects/${key}/statuses`);
  await page.getByRole('button', { name: 'Go back to the organization’s workflow' }).click();
  const revert = page.getByRole('dialog', { name: 'Go back to the organization’s workflow?' });
  await revert.getByLabel('Issues in “Review” (1) go to').selectOption({ label: 'To do' });
  await expectAccessible(page);
  await revert.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByText('This project follows the organization’s workflow')).toBeVisible();

  await page.goto(`/issues/${key}-1`);
  await expect(status('To do')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Activity' }).getByRole('listitem').first(),
  ).toContainText('changed the status Review to To do');
});
