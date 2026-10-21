import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserSummary } from '@toppo/shared';
import { Alert } from '@toppo/ui';
import { useState } from 'react';
import { requestErrorMessage } from '../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../shared/i18n/plural.util.ts';
import { Users } from '../api/users.api.ts';
import { applyUserChange, type UserChange } from '../models/user-change.model.ts';
import { UsersQueries } from '../queries/users.queries.ts';
import {
  ALL_MEMBERS,
  countByRole,
  filterMembers,
  type MemberFilter,
} from '../utils/member-filter.util.ts';
import { MemberFilters } from './member-filters.tsx';
import { MemberRow } from './member-row.tsx';

const KNOWN_ERRORS = {
  LAST_ADMINISTRATOR: 'members.lastAdministrator',
  CANNOT_DEACTIVATE_SELF: 'members.cannotDeactivateSelf',
  USER_NOT_FOUND: 'members.userNotFound',
  INVALID_ROLE: 'members.invalidRole',
} as const;

function send(change: UserChange): Promise<void> {
  switch (change.type) {
    case 'changeRole':
      return Users.changeRole(change.userId, change.roleId);
    case 'deactivate':
      return Users.deactivate(change.userId);
    case 'reactivate':
      return Users.reactivate(change.userId);
  }
}

/**
 * Every member, by role tab and search, with their role and state. A change shows at once and
 * is rolled back, with the reason, if the server refuses it. Reports accepted changes, e.g. to
 * refresh one's own session.
 */
export function MembersTable({
  currentUserId,
  onUserChanged,
}: {
  currentUserId: string;
  onUserChanged?: (userId: string) => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const members = useQuery(UsersQueries.list);
  const roles = useQuery(UsersQueries.assignableRoles);
  const [filter, setFilter] = useState<MemberFilter>(ALL_MEMBERS);
  const listKey = UsersQueries.list.queryKey;

  const change = useMutation({
    mutationFn: send,
    onMutate: async (pending) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (current: UserSummary[] | undefined) =>
        current ? applyUserChange(current, pending, roles.data ?? [], new Date()) : current,
      );
      return { previous };
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(listKey, context?.previous);
    },
    onSuccess: (_data, accepted) => onUserChanged?.(accepted.userId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  if (members.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('members.loading')}
      </p>
    );
  }
  if (members.isError) {
    return <Alert tone="danger">{requestErrorMessage(members.error, t)}</Alert>;
  }

  const shown = filterMembers(members.data, filter);
  return (
    <div className="flex flex-col gap-4">
      {change.isError ? (
        <Alert tone="danger">{requestErrorMessage(change.error, t, KNOWN_ERRORS)}</Alert>
      ) : null}
      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        <MemberFilters
          roles={roles.data ?? []}
          counts={countByRole(members.data)}
          total={members.data.length}
          filter={filter}
          onChange={setFilter}
        />
        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t('members.noMatch')}
          </p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2.5 pr-2 pl-4 font-medium">
                  {t('members.member')}
                </th>
                <th scope="col" className="w-32 px-2 py-2.5 font-medium sm:w-44">
                  {t('members.role')}
                </th>
                <th scope="col" className="hidden w-32 px-2 py-2.5 font-medium md:table-cell">
                  {t('members.state')}
                </th>
                <th scope="col" className="w-12 py-2.5 pr-2">
                  <span className="sr-only">{t('members.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  roles={roles.data ?? []}
                  isCurrentUser={member.id === currentUserId}
                  onChange={(next) => change.mutate(next)}
                />
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {t(`members.shown.${pluralForm(locale, shown.length)}`, { count: shown.length })}
        </p>
      </section>
    </div>
  );
}
