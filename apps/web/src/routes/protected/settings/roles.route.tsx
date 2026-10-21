import { useQuery } from '@tanstack/react-query';
import { createRoute, useBlocker } from '@tanstack/react-router';
import { can } from '@toppo/core';
import { useState } from 'react';
import { LeaveDialog } from '../../../features/roles/components/dialogs/leave-dialog.tsx';
import { NewRole } from '../../../features/roles/components/dialogs/new-role.tsx';
import { RolesEditor } from '../../../features/roles/components/roles-editor.tsx';
import { SessionQueries } from '../../../features/session/queries/session.queries.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { AccessDenied } from '../../../shared/layout/access-denied.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { settingsRoute } from './settings.route.tsx';

export const rolesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'roles',
  staticData: { titleKey: 'roles.title' },
  component: RolesScreen,
});

function RolesScreen() {
  const { t } = useI18n();
  const { data: user } = useQuery(SessionQueries.currentUser);
  const [pending, setPending] = useState(false);
  // Unsaved permissions are not lost by a click elsewhere, nor by closing the tab.
  const leaving = useBlocker({
    shouldBlockFn: () => pending,
    enableBeforeUnload: () => pending,
    withResolver: true,
  });

  if (!(user && can(user.permissions, 'instance.roles.manage'))) {
    return (
      <Page title={t('roles.title')}>
        <AccessDenied />
      </Page>
    );
  }
  return (
    <Page title={t('roles.title')} description={t('roles.description')} actions={<NewRole />}>
      <RolesEditor onPendingChange={setPending} />
      <LeaveDialog
        open={leaving.status === 'blocked'}
        onStay={() => leaving.reset?.()}
        onLeave={() => leaving.proceed?.()}
      />
    </Page>
  );
}
