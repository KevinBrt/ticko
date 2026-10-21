import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { can } from '@toppo/core';
import { SessionQueries } from '../../../features/session/queries/session.queries.ts';
import { MembersTable } from '../../../features/users/components/members-table.tsx';
import { UsersQueries } from '../../../features/users/queries/users.queries.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../shared/i18n/plural.util.ts';
import { AccessDenied } from '../../../shared/layout/access-denied.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { settingsRoute } from './settings.route.tsx';

export const membersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'members',
  staticData: { titleKey: 'members.title' },
  component: MembersScreen,
});

function MembersScreen() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(SessionQueries.currentUser);
  const allowed = Boolean(user && can(user.permissions, 'instance.users.manage'));
  const members = useQuery({ ...UsersQueries.list, enabled: allowed });

  if (!(user && allowed)) {
    return (
      <Page title={t('members.title')}>
        <AccessDenied />
      </Page>
    );
  }
  const count = members.data?.length;
  return (
    <Page
      title={t('members.title')}
      description={
        count === undefined ? undefined : t(`members.count.${pluralForm(locale, count)}`, { count })
      }
    >
      <MembersTable
        currentUserId={user.id}
        onUserChanged={async (userId) => {
          // One's own role may have changed what the app should show.
          if (userId === user.id) {
            await queryClient.invalidateQueries({ queryKey: SessionQueries.currentUser.queryKey });
          }
        }}
      />
    </Page>
  );
}
