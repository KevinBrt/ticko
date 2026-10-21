import type { UserSummary } from '@toppo/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@toppo/ui';
import { EllipsisVerticalIcon, Trash2Icon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import type { UserChange } from '../../models/user-change.model.ts';
import { DeleteMemberDialog } from './delete-member-dialog.tsx';

/** The ⋮ menu of a member's row: deactivate or reactivate, or delete after confirming. */
export function MemberActions({
  member,
  onChange,
}: {
  member: UserSummary;
  onChange: (change: UserChange) => void;
}) {
  const { t } = useI18n();
  const trigger = useRef<HTMLButtonElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deactivated = member.deactivatedAt !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            aria-label={t('members.actionsFor', { name: member.name })}
          >
            <EllipsisVerticalIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          // The confirmation takes the focus; the menu must not take it back.
          onCloseAutoFocus={(event) => (confirmingDelete ? event.preventDefault() : undefined)}
        >
          {deactivated ? (
            <DropdownMenuItem onSelect={() => onChange({ type: 'reactivate', userId: member.id })}>
              <UserCheckIcon aria-hidden="true" />
              {t('members.reactivate')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onChange({ type: 'deactivate', userId: member.id })}>
              <UserXIcon aria-hidden="true" />
              {t('members.deactivate')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger" onSelect={() => setConfirmingDelete(true)}>
            <Trash2Icon aria-hidden="true" />
            {t('members.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteMemberDialog
        member={member}
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        onConfirm={() => onChange({ type: 'delete', userId: member.id })}
        onClosed={() => trigger.current?.focus()}
      />
    </>
  );
}
