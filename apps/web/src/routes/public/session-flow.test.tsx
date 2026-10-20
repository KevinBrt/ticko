import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ADA, ADA_PASSWORD, fakeServer, GOOD_SETUP_CODE, renderApp } from '../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('route guards', () => {
  it('sends visitors of a fresh instance to the setup wizard', async () => {
    fakeServer({ setupRequired: true });
    const { screen, router } = await renderApp({ path: '/issues' });

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Set up Ticko' }))
      .toBeVisible();
    expect(router.state.location.pathname).toBe('/setup');
  });

  it('sends signed-out visitors to the sign-in page, remembering where they were going', async () => {
    fakeServer();
    const { screen, router } = await renderApp({ path: '/projects' });

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Sign in to Ticko' }))
      .toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ redirect: '/projects' });
  });

  it('closes the wizard once the instance is set up', async () => {
    fakeServer({ user: ADA });
    const { router, screen } = await renderApp({ path: '/setup' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/issues');
  });
});

describe('signing in', () => {
  it('explains what is missing before calling the server', async () => {
    const server = fakeServer();
    const { screen } = await renderApp({ path: '/login' });

    await screen.getByRole('button', { name: 'Sign in' }).click();

    await expect.element(screen.getByText('Enter a valid email address.')).toBeVisible();
    await expect.element(screen.getByText('This field is required.')).toBeVisible();
    expect(server.requests.filter((request) => request.method === 'POST')).toHaveLength(0);
  });

  it('reports wrong credentials', async () => {
    fakeServer();
    const { screen } = await renderApp({ path: '/login' });

    await screen.getByLabelText('Email').fill(ADA.email);
    await screen.getByLabelText('Password', { exact: true }).fill('wrong password');
    await screen.getByRole('button', { name: 'Sign in' }).click();

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Incorrect email or password.');
  });

  it('opens the page the visitor was going to', async () => {
    fakeServer();
    const { screen, router } = await renderApp({ path: '/login?redirect=%2Fsettings' });

    await screen.getByLabelText('Email').fill(ADA.email);
    await screen.getByLabelText('Password', { exact: true }).fill(ADA_PASSWORD);
    await screen.getByRole('button', { name: 'Sign in' }).click();

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/settings');
  });

  it.each(['//evil.example.com', '/\\evil.example.com', 'https://evil.example.com'])(
    'never redirects to another site (%s)',
    async (target) => {
      fakeServer();
      const { screen, router } = await renderApp({
        path: `/login?redirect=${encodeURIComponent(target)}`,
      });

      await screen.getByLabelText('Email').fill(ADA.email);
      await screen.getByLabelText('Password', { exact: true }).fill(ADA_PASSWORD);
      await screen.getByRole('button', { name: 'Sign in' }).click();

      await expect.element(screen.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
      expect(router.state.location.pathname).toBe('/issues');
    },
  );
});

describe('signing out', () => {
  it('ends the session and returns to the sign-in page', async () => {
    const server = fakeServer({ user: ADA });
    const { screen, router } = await renderApp();

    await screen.getByRole('button', { name: 'Sign out' }).click();

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Sign in to Ticko' }))
      .toBeVisible();
    expect(router.state.location.pathname).toBe('/login');
    expect(server.state.user).toBeNull();
  });
});

describe('first-run setup', () => {
  async function fillSetupForm(
    screen: Awaited<ReturnType<typeof renderApp>>['screen'],
    code: string,
  ) {
    await screen.getByLabelText('Setup code').fill(code);
    await screen.getByLabelText('Organization name').fill('Acme');
    await screen.getByLabelText('Your name').fill(ADA.name);
    await screen.getByLabelText('Email').fill(ADA.email);
    await screen.getByLabelText('Password', { exact: true }).fill(ADA_PASSWORD);
    await screen.getByRole('button', { name: 'Create administrator account' }).click();
  }

  it('validates the form, with the password rule spelled out', async () => {
    fakeServer({ setupRequired: true });
    const { screen } = await renderApp({ path: '/setup' });

    await screen.getByLabelText('Password', { exact: true }).fill('short');
    await screen.getByRole('button', { name: 'Create administrator account' }).click();

    await expect.element(screen.getByText('Use at least 12 characters.')).toBeVisible();
    await expect
      .element(screen.getByLabelText('Setup code'))
      .toHaveAttribute('aria-invalid', 'true');
  });

  it('reports a wrong setup code', async () => {
    fakeServer({ setupRequired: true });
    const { screen } = await renderApp({ path: '/setup' });

    await fillSetupForm(screen, 'WRONG-CODE-XXXX');

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('This setup code is not valid. Copy it again from the server logs.');
  });

  it('creates the administrator and signs them in', async () => {
    const server = fakeServer({ setupRequired: true });
    const { screen, router } = await renderApp({ path: '/setup' });

    await fillSetupForm(screen, GOOD_SETUP_CODE.toLowerCase());

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Issues' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/issues');
    expect(server.state.user).toStrictEqual(ADA);
    expect(
      server.requests.find(
        (request) => request.path === '/api/v1/setup' && request.method === 'POST',
      )?.body,
    ).toStrictEqual({
      setupCode: GOOD_SETUP_CODE.toLowerCase(),
      instanceName: 'Acme',
      admin: { name: ADA.name, email: ADA.email, password: ADA_PASSWORD },
      locale: 'en',
    });
  });
});
