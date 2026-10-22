import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProjectMember, ProjectMembersQuery, ProjectMembersResponse } from '@toppo/shared';
import {
  Alert,
  Avatar,
  Badge,
  BadgeSelect,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@toppo/ui';
import { EllipsisVerticalIcon, SearchIcon, UserMinusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';
import { Pager } from '../../../../shared/layout/pager.tsx';
import { ProjectMembers } from '../../api/project-members.api.ts';
import { ProjectsQueries } from '../../queries/projects.queries.ts';
import { AddMembersDialog } from './add-members-dialog.tsx';

const KNOWN_ERRORS = {
  ROLE_BEYOND_YOURS: 'projectMembers.roleBeyondYours',
  MEMBER_NOT_FOUND: 'projectMembers.memberNotFound',
  INVALID_ROLE: 'projectMembers.invalidRole',
} as const;

/** The search goes to the server once typing pauses, not on every key. */
const SEARCH_DELAY_MS = 300;

/** The value of the "own role" option: the role the member has everywhere else. Never a role id. */
const OWN_ROLE = 'own';

type Change =
  | { type: 'changeRole'; userId: string; roleId: string | null }
  | { type: 'remove'; userId: string };

/**
 * One page of a project's members, as the server searched it: their role here, changed in place,
 * and the way to take them out. Changes show at once and roll back, with the reason, when the
 * server refuses them.
 */
export function ProjectMembersTable({
  projectKey,
  query,
  onQueryChange,
}: {
  projectKey: string;
  query: ProjectMembersQuery;
  onQueryChange: (query: ProjectMembersQuery) => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const members = useQuery(ProjectsQueries.members(projectKey, query));
  const roles = useQuery(ProjectsQueries.roles(projectKey));
  const [failure, setFailure] = useState<unknown>(null);
  const search = query.search ?? '';
  const [typed, setTyped] = useState(search);
  const pages = ProjectsQueries.allMembers(projectKey);

  useEffect(() => setTyped(search), [search]);
  useEffect(() => {
    if (typed.trim() === search) {
      return;
    }
    const timer = setTimeout(
      () => onQueryChange({ search: typed.trim() || undefined }),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed, search, onQueryChange]);

  const change = useMutation({
    mutationFn: (pending: Change) =>
      pending.type === 'remove'
        ? ProjectMembers.remove(projectKey, pending.userId)
        : ProjectMembers.changeRole(projectKey, pending.userId, pending.roleId),
    onMutate: async (pending) => {
      setFailure(null);
      await queryClient.cancelQueries({ queryKey: pages });
      const previous = queryClient.getQueriesData<ProjectMembersResponse>({ queryKey: pages });
      queryClient.setQueriesData<ProjectMembersResponse>({ queryKey: pages }, (page) =>
        page ? { ...page, rows: applyChange(page.rows, pending, roles.data ?? []) } : page,
      );
      return previous;
    },
    onError: (error, _change, previous) => {
      setFailure(error);
      for (const [key, data] of previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ProjectsQueries.all }),
  });

  if (members.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('projectMembers.loading')}
      </p>
    );
  }
  if (members.isError) {
    return <Alert tone="danger">{requestErrorMessage(members.error, t)}</Alert>;
  }

  const { rows, matching, page, pageSize } = members.data;
  const givable = roles.data ?? [];
  return (
    <div className="flex flex-col gap-4">
      {failure ? (
        <Alert tone="danger">{requestErrorMessage(failure, t, KNOWN_ERRORS)}</Alert>
      ) : null}
      <section
        aria-busy={members.isPlaceholderData}
        className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-64">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label={t('projectMembers.search')}
              placeholder={t('projectMembers.search')}
              value={typed}
              maxLength={100}
              onChange={(event) => setTyped(event.target.value)}
              className="pl-9"
            />
          </div>
          <AddMembersDialog projectKey={projectKey} roles={givable} />
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t('projectMembers.noMatch')}
          </p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2.5 pr-2 pl-4 font-medium">
                  {t('projectMembers.member')}
                </th>
                <th scope="col" className="w-36 px-2 py-2.5 font-medium sm:w-52">
                  {t('projectMembers.role')}
                </th>
                <th scope="col" className="w-12 py-2.5 pr-2">
                  <span className="sr-only">{t('projectMembers.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  givable={givable}
                  onChange={(next) => change.mutate(next)}
                />
              ))}
            </tbody>
          </table>
        )}
        <Pager
          page={page}
          pageSize={pageSize}
          matching={matching}
          shown={rows.length}
          label={(count) => t(`projectMembers.shown.${pluralForm(locale, count)}`, { count })}
          onPage={(next) => onQueryChange({ ...query, page: next })}
        />
      </section>
    </div>
  );
}

function MemberRow({
  member,
  givable,
  onChange,
}: {
  member: ProjectMember;
  givable: readonly { id: string; name: string; color: ProjectMember['ownRole']['color'] }[];
  onChange: (change: Change) => void;
}) {
  const { t } = useI18n();
  const current = member.projectRole ?? member.ownRole;
  // A role the caller may not give stays as it is: the server would refuse any change.
  const changeable = member.projectRole === null || givable.some(({ id }) => id === current.id);
  const options = [
    {
      value: OWN_ROLE,
      label: t('projectMembers.ownRole', { role: member.ownRole.name }),
      tone: member.ownRole.color,
    },
    ...givable.map((role) => ({ value: role.id, label: role.name, tone: role.color })),
  ];

  return (
    <tr>
      <td className="py-3 pr-2 pl-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.name} className="hidden sm:flex" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{member.name}</p>
            <p className="truncate text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-3">
        {changeable ? (
          <BadgeSelect
            aria-label={t('projectMembers.roleOf', { name: member.name })}
            options={options}
            value={member.projectRole?.id ?? OWN_ROLE}
            onValueChange={(value) =>
              onChange({
                type: 'changeRole',
                userId: member.userId,
                roleId: value === OWN_ROLE ? null : value,
              })
            }
            className="max-w-full"
          />
        ) : (
          <Badge tone={current.color}>{current.name}</Badge>
        )}
      </td>
      <td className="py-3 pr-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('projectMembers.actionsFor', { name: member.name })}
            >
              <EllipsisVerticalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              tone="danger"
              onSelect={() => onChange({ type: 'remove', userId: member.userId })}
            >
              <UserMinusIcon aria-hidden="true" />
              {t('projectMembers.remove')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

/** A change, applied to the rows shown before the server confirms it. */
function applyChange(
  rows: readonly ProjectMember[],
  change: Change,
  roles: readonly { id: string; name: string; color: ProjectMember['ownRole']['color'] }[],
): ProjectMember[] {
  if (change.type === 'remove') {
    return rows.filter(({ userId }) => userId !== change.userId);
  }
  const role = roles.find(({ id }) => id === change.roleId) ?? null;
  return rows.map((row) => (row.userId === change.userId ? { ...row, projectRole: role } : row));
}
