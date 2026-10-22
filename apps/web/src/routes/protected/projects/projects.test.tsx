import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ADA, fakeProject, fakeServer, GRACE, renderApp } from '../../../test-helpers.tsx';

beforeEach(async () => {
  await page.viewport(1280, 800);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PROJECTS = () => [
  fakeProject('WEB', 'Website', { description: 'The public site' }),
  fakeProject('API', 'Public API'),
  fakeProject('OLD', 'Old intranet', { archived: true }),
];

describe('the projects list', () => {
  it('shows the active projects one reaches, the archived ones apart', async () => {
    fakeServer({ user: ADA, projects: PROJECTS() });
    const { screen } = await renderApp({ path: '/projects' });

    await expect.element(screen.getByRole('link', { name: /^WEB Website/ })).toBeVisible();
    await expect.element(screen.getByRole('link', { name: /^API Public API/ })).toBeVisible();
    await expect.element(screen.getByText('Old intranet')).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Archived 1' }).click();

    await expect.element(screen.getByRole('link', { name: /^OLD Old intranet/ })).toBeVisible();
    await expect.element(screen.getByText('Website')).not.toBeInTheDocument();
  });

  it('has the server search, keeping the search in the address', async () => {
    const server = fakeServer({ user: ADA, projects: PROJECTS() });
    const { screen, router } = await renderApp({ path: '/projects' });

    await screen.getByRole('searchbox', { name: 'Key or name' }).fill('api');

    await expect.element(screen.getByText('Website')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: /^API/ })).toBeVisible();
    expect(router.state.location.search).toEqual({ q: 'api' });
    expect(server.requests.some(({ path }) => path === '/api/v1/projects?search=api')).toBe(true);
  });

  it('creates a project, its key suggested by its name, then opens it', async () => {
    const server = fakeServer({ user: ADA });
    const { screen, router } = await renderApp({ path: '/projects' });

    await screen.getByRole('button', { name: 'New project' }).click();
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    await dialog.getByLabelText('Name').fill('Portail clients');
    await expect.element(dialog.getByLabelText('Key')).toHaveValue('PC');
    await dialog.getByRole('button', { name: 'Create the project' }).click();

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Portail clients' }))
      .toBeVisible();
    expect(router.state.location.pathname).toBe('/projects/PC');
    expect(server.requests.find(({ method }) => method === 'POST')?.body).toEqual({
      key: 'PC',
      name: 'Portail clients',
      description: '',
    });
  });

  it('keeps the key the person typed, and says when another project has it', async () => {
    fakeServer({ user: ADA, projects: PROJECTS() });
    const { screen } = await renderApp({ path: '/projects' });

    await screen.getByRole('button', { name: 'New project' }).click();
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    await dialog.getByLabelText('Key').fill('web');
    await dialog.getByLabelText('Name').fill('Another website');
    await expect.element(dialog.getByLabelText('Key')).toHaveValue('WEB');
    await dialog.getByRole('button', { name: 'Create the project' }).click();

    await expect.element(dialog.getByText('Another project already has this key.')).toBeVisible();
  });

  it('offers no creation to someone who may not create projects', async () => {
    fakeServer({ user: { ...GRACE, permissions: [] }, projects: PROJECTS() });
    const { screen } = await renderApp({ path: '/projects' });

    await expect.element(screen.getByRole('link', { name: /^WEB/ })).toBeVisible();
    await expect
      .element(screen.getByRole('button', { name: 'New project' }))
      .not.toBeInTheDocument();
  });
});

describe('a project', () => {
  it('shows its name, and its settings to those who manage it', async () => {
    fakeServer({ user: ADA, projects: PROJECTS() });
    const { screen } = await renderApp({ path: '/projects/WEB' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Website' })).toBeVisible();
    await expect.element(screen.getByText('The public site')).toBeVisible();
    await expect
      .element(
        screen
          .getByRole('navigation', { name: 'Breadcrumb' })
          .getByRole('link', { name: 'Projects' }),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole('main').getByRole('link', { name: 'Settings' }))
      .toBeVisible();
  });

  it('shows no settings to a member who manages nothing there', async () => {
    fakeServer({ user: GRACE, projects: PROJECTS() });
    const { screen } = await renderApp({ path: '/projects/WEB' });

    await expect.element(screen.getByRole('heading', { level: 1, name: 'Website' })).toBeVisible();
    await expect
      .element(screen.getByRole('main').getByRole('link', { name: 'Settings' }))
      .not.toBeInTheDocument();
  });

  it('answers as if it did not exist when one cannot reach it', async () => {
    fakeServer({
      user: GRACE,
      projects: [fakeProject('HR', 'People', { members: [{ userId: ADA.id, roleId: null }] })],
    });
    const { screen } = await renderApp({ path: '/projects/HR' });

    await expect
      .element(screen.getByText('This project does not exist, or you do not have access to it.'))
      .toBeVisible();
    await expect.element(screen.getByText('People')).not.toBeInTheDocument();
  });
});
