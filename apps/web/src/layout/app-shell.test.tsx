import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { I18nProvider } from '../i18n/i18n-provider.tsx';
import type { Locale } from '../i18n/types.ts';
import { createAppRouter } from '../router.tsx';

function renderApp({ path = '/issues', locale = 'en' }: { path?: string; locale?: Locale } = {}) {
  const router = createAppRouter({ history: createMemoryHistory({ initialEntries: [path] }) });
  return render(
    <I18nProvider locale={locale}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe('AppShell on desktop', () => {
  it('redirects / to the issues page', async () => {
    const screen = await renderApp({ path: '/' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
  });

  it('shows the sidebar and marks the current page', async () => {
    const screen = await renderApp({ path: '/projects' });
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });

    await expect.element(nav).toBeVisible();
    await expect
      .element(nav.getByRole('link', { name: 'Projects' }))
      .toHaveAttribute('aria-current', 'page');
    await expect
      .element(nav.getByRole('link', { name: 'Issues' }))
      .not.toHaveAttribute('aria-current');
    await expect
      .element(screen.getByRole('button', { name: 'Open navigation', includeHidden: true }))
      .not.toBeVisible();
  });

  it('navigates and updates the heading and the tab title', async () => {
    const screen = await renderApp();

    await screen.getByRole('link', { name: 'Settings' }).click();

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    expect(document.title).toBe('Settings · Ticko');
  });

  it('offers a skip link to the main content', async () => {
    const screen = await renderApp();

    await expect
      .element(screen.getByRole('link', { name: 'Skip to content' }))
      .toHaveAttribute('href', '#main');
  });

  it('shows a not-found page inside the shell', async () => {
    const screen = await renderApp({ path: '/does-not-exist' });

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Page not found' }))
      .toBeVisible();
    await expect.element(screen.getByRole('link', { name: 'Back to issues' })).toBeVisible();
  });

  it('speaks French when the locale is French', async () => {
    const screen = await renderApp({ locale: 'fr' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Tickets' })).toBeVisible();
    expect(document.documentElement.lang).toBe('fr');
  });
});

describe('AppShell on a phone', () => {
  it('hides the sidebar behind a menu button', async () => {
    await page.viewport(375, 812);
    const screen = await renderApp();

    await expect
      .element(screen.getByRole('navigation', { name: 'Main navigation', includeHidden: true }))
      .not.toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  });

  it('opens the navigation drawer and closes it after navigating', async () => {
    await page.viewport(375, 812);
    const screen = await renderApp();

    await screen.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = screen.getByRole('dialog', { name: 'Main navigation' });
    await expect.element(drawer).toBeVisible();

    await drawer.getByRole('link', { name: 'My issues' }).click();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'My issues' }))
      .toBeVisible();
  });

  it('never scrolls horizontally', async () => {
    await page.viewport(320, 640);
    await renderApp();

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  });
});
