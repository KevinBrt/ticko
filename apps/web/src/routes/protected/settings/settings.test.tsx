import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ADA, fakeServer, GRACE, renderApp } from '../../../test-helpers.tsx';

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(1280, 800);
});

describe('the settings', () => {
  it('are open to administrators', async () => {
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings' });

    await expect.element(screen.getByText('Nothing to configure yet')).toBeVisible();
  });

  it('are left out of the navigation of users who manage nothing', async () => {
    fakeServer({ user: GRACE });
    const { screen } = await renderApp();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });

    await expect.element(nav.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect.element(nav.getByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('are left out of the phone drawer too', async () => {
    await page.viewport(375, 812);
    fakeServer({ user: GRACE });
    const { screen } = await renderApp();

    await screen.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = screen.getByRole('dialog', { name: 'Main navigation' });

    await expect.element(drawer.getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect.element(drawer.getByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('tell such a user they have no access when they open the address anyway', async () => {
    fakeServer({ user: GRACE });
    const { screen } = await renderApp({ path: '/settings' });

    await expect
      .element(screen.getByRole('heading', { name: 'You do not have access to this page' }))
      .toBeVisible();
    await expect.element(screen.getByText('Nothing to configure yet')).not.toBeInTheDocument();
  });
});
