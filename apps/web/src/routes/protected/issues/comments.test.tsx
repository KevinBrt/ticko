import type { IssueActivity } from '@toppo/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
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

const COMMENT_ID = '01a1569b-9900-7000-8000-000000000950';

/** WEB-1, its history a comment of Grace's: shown to `user`. */
function server(user = ADA, { archived = false } = {}) {
  const fake = fakeServer({
    user,
    projects: [
      fakeProject('WEB', 'Website', {
        archived,
        members: [
          { userId: ADA.id, roleId: null },
          { userId: GRACE.id, roleId: null },
        ],
      }),
    ],
    issues: [fakeIssue('WEB', 1, 'Broken link')],
  });
  fake.state.users.push(memberOf(GRACE, ROLE_BADGES.team));
  const graces: IssueActivity = {
    id: '01a1569b-9900-7000-8000-000000000850',
    type: 'issue.commented',
    actor: { id: GRACE.id, name: GRACE.name },
    createdAt: '2026-10-22T09:30:00.000Z',
    payload: {
      comment: {
        id: COMMENT_ID,
        body: 'Seen on **Safari**.\nNot on Firefox.',
        editedAt: null,
        actions: [],
      },
    },
  };
  fake.state.activities.set('WEB-1', [graces]);
  return fake;
}

const activity = () => page.getByRole('region', { name: 'Activity' });
const commentBox = () => page.getByRole('textbox', { name: 'Add a comment' });
const menuOf = (name: string) =>
  page.getByRole('button', { name: `Actions on the comment of ${name}` });

describe('the comments of an issue', () => {
  it('shows each comment as written, its line breaks kept, nothing interpreted', async () => {
    server();
    await renderApp({ path: '/issues/WEB-1' });

    const graces = activity().getByRole('listitem').filter({ hasText: 'Grace Hopper commented' });
    const words = graces.getByText(/^Seen on \*\*Safari\*\*\./);
    await expect.element(words).toBeVisible();
    expect(words.element().textContent).toBe('Seen on **Safari**.\nNot on Firefox.');
    await expect.element(graces.getByRole('strong')).not.toBeInTheDocument();
  });

  it('comments from above the activity, the new comment first, the box then empty', async () => {
    const fake = server();
    const { screen } = await renderApp({ path: '/issues/WEB-1' });

    const send = screen.getByRole('button', { name: 'Send' });
    await expect.element(send).toBeDisabled();
    await commentBox().fill('Fixed in 1.2.\nDeployed tonight.');
    await send.click();

    const first = activity().getByRole('listitem').first();
    await expect.element(first.getByText(/^Fixed in 1\.2\./)).toBeVisible();
    await expect.element(first.getByText('Ada Lovelace', { exact: true })).toBeVisible();
    await expect.element(commentBox()).toHaveValue('');
    expect(fake.requests).toContainEqual({
      method: 'POST',
      path: '/api/v1/issues/WEB-1/comments',
      body: { body: 'Fixed in 1.2.\nDeployed tonight.' },
    });
  });

  it('addresses the reply to whoever reported the issue', async () => {
    server(GRACE);
    await renderApp({ path: '/issues/WEB-1' });

    await expect.element(commentBox()).toHaveAttribute('placeholder', 'Write your reply to Ada…');
  });

  it('asks for a plain comment on an issue one reported oneself', async () => {
    server(ADA);
    await renderApp({ path: '/issues/WEB-1' });

    await expect.element(commentBox()).toHaveAttribute('placeholder', 'Write a comment…');
  });

  it('is edited in place by its author, then marked as edited', async () => {
    const fake = server(GRACE);
    const { screen } = await renderApp({ path: '/issues/WEB-1' });

    await menuOf('Grace Hopper').click();
    await screen.getByRole('menuitem', { name: 'Edit' }).click();
    const editor = screen.getByRole('textbox', { name: 'Comment', exact: true });
    await editor.fill('Seen on Firefox too.');
    await screen.getByRole('button', { name: 'Save' }).click();

    await expect.element(activity().getByText('Seen on Firefox too.')).toBeVisible();
    await expect.element(activity().getByText('edited', { exact: true })).toBeVisible();
    expect(fake.requests).toContainEqual({
      method: 'PATCH',
      path: `/api/v1/issues/WEB-1/comments/${COMMENT_ID}`,
      body: { body: 'Seen on Firefox too.' },
    });
  });

  it('is deleted after asking, and leaves the activity', async () => {
    server(GRACE);
    const { screen } = await renderApp({ path: '/issues/WEB-1' });

    await menuOf('Grace Hopper').click();
    await screen.getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = screen.getByRole('dialog', { name: 'Delete this comment?' });
    await dialog.getByRole('button', { name: 'Delete the comment' }).click();

    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(activity().getByText(/Safari/)).not.toBeInTheDocument();
  });

  it('lets a moderator delete the comment of someone else, never change its words', async () => {
    server(ADA);
    const { screen } = await renderApp({ path: '/issues/WEB-1' });

    await menuOf('Grace Hopper').click();

    await expect.element(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await expect.element(screen.getByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('offers nothing to do in an archived project', async () => {
    server(GRACE, { archived: true });
    await renderApp({ path: '/issues/WEB-1' });

    await expect.element(activity().getByText(/Safari/)).toBeVisible();
    await expect.element(commentBox()).not.toBeInTheDocument();
    await expect.element(menuOf('Grace Hopper')).not.toBeInTheDocument();
  });
});
