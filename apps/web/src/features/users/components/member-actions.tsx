import type { UserSummary } from '@toppo/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@toppo/ui';
import { EllipsisVerticalIcon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import type { UserChange } from '../models/user-change.model.ts';

/** The ⋮ menu of a member's row. */
export function MemberActions({
  member,
  onChange,
}: {
  member: UserSummary;
  onChange: (change: UserChange) => void;
}) {
  const { t } = useI18n();
  const deactivated = member.deactivatedAt !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('members.actionsFor', { name: member.name })}
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {deactivated ? (
          <DropdownMenuItem onSelect={() => onChange({ type: 'reactivate', userId: member.id })}>
            <UserCheckIcon aria-hidden="true" />
            {t('members.reactivate')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            tone="danger"
            onSelect={() => onChange({ type: 'deactivate', userId: member.id })}
          >
            <UserXIcon aria-hidden="true" />
            {t('members.deactivate')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
