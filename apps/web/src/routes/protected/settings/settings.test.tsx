import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ADA, fakeServer, GRACE, renderApp } from '../../../test-helpers.tsx';

afterEach(async () => {
  vi.restoreAllMocks();
  await page.viewport(1280, 800);
});

describe('the settings', () => {
  it('open on the first section an administrator manages, with their own navigation', async () => {
    fakeServer({ user: ADA });
    const { screen, router } = await renderApp({ path: '/settings' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/settings/members');
    await expect
      .element(
        screen.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', {
          name: 'Members',
        }),
      )
      .toHaveAttribute('aria-current', 'page');
  });

  it('show where one is: Settings / Members', async () => {
    fakeServer({ user: ADA });
    const { screen } = await renderApp({ path: '/settings/members' });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });

    await breadcrumb.getByRole('link', { name: 'Settings' }).click();

    await expect.element(breadcrumb.getByText('Members')).toHaveAttribute('aria-current', 'page');
  });

  it('have nothing to show yet to users who only manage instance settings', async () => {
    fakeServer({ user: { ...GRACE, permissions: ['instance.settings.manage'] } });
    const { screen } = await renderApp({ path: '/settings' });

    await expect.element(screen.getByText('Nothing to configure yet')).toBeVisible();
    await expect
      .element(screen.getByRole('navigation', { name: 'Settings sections' }))
      .not.toBeInTheDocument();
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
