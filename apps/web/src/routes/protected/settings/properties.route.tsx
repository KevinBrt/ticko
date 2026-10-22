import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoute } from '@tanstack/react-router';
import { can } from '@toppo/core';
import { Alert } from '@toppo/ui';
import { useState } from 'react';
import { IssuesQueries } from '../../../features/issues/queries/issues.queries.ts';
import {
  type BuiltInProperty,
  PropertiesList,
} from '../../../features/properties/components/list/properties-list.tsx';
import { CategoryPanel } from '../../../features/properties/components/panels/category-panel.tsx';
import { PriorityPanel } from '../../../features/properties/components/panels/priority-panel.tsx';
import { PropertiesQueries } from '../../../features/properties/queries/properties.queries.ts';
import { SessionQueries } from '../../../features/session/queries/session.queries.ts';
import { requestErrorMessage } from '../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { AccessDenied } from '../../../shared/layout/access-denied.tsx';
import { Page } from '../../../shared/layout/page.tsx';
import { settingsRoute } from './settings.route.tsx';

/** The fields that describe an issue, for the whole organization. */
export const propertiesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'properties',
  staticData: { titleKey: 'properties.title' },
  component: PropertiesScreen,
});

function PropertiesScreen() {
  const { t } = useI18n();
  const { data: user } = useQuery(SessionQueries.currentUser);
  const allowed = Boolean(user && can(user.permissions, 'instance.settings.manage'));
  const categories = useQuery({ ...PropertiesQueries.categories, enabled: allowed });
  const priorities = useQuery({ ...PropertiesQueries.priorities, enabled: allowed });
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BuiltInProperty | null>(null);

  if (!allowed) {
    return (
      <Page title={t('properties.title')}>
        <AccessDenied />
      </Page>
    );
  }
  const failure = categories.error ?? priorities.error;
  const panel = (property: BuiltInProperty) => ({
    open: editing === property,
    onOpenChange: (open: boolean) => setEditing(open ? property : null),
    // The issue forms show the new names and the new default at once.
    onSaved: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: IssuesQueries.all });
    },
  });

  return (
    <Page title={t('properties.title')} description={t('properties.description')}>
      {failure ? <Alert tone="danger">{requestErrorMessage(failure, t)}</Alert> : null}
      {categories.data && priorities.data ? (
        <>
          <PropertiesList
            categories={categories.data}
            priorities={priorities.data}
            onEdit={setEditing}
          />
          <CategoryPanel categories={categories.data} {...panel('category')} />
          <PriorityPanel priorities={priorities.data} {...panel('priority')} />
        </>
      ) : null}
      {categories.isPending || priorities.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t('properties.loading')}
        </p>
      ) : null}
    </Page>
  );
}
