import { useQuery } from '@tanstack/react-query';
import { INVITATION_LIFETIME_DAYS } from '@toppo/core';
import type { CreateInvitationsResponse } from '@toppo/shared';
import { Button, Dialog, DialogContent, DialogTrigger } from '@toppo/ui';
import { UserPlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { UsersQueries } from '../../queries/users.queries.ts';
import { InvitationLinks } from './invitation-links.tsx';
import { InviteForm } from './invite-form.tsx';

/** The "Invite members" button and its dialog: addresses and a role first, then the links. */
export function InviteMembers() {
  const { t } = useI18n();
  const roles = useQuery(UsersQueries.assignableRoles);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CreateInvitationsResponse | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setResult(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon aria-hidden="true" />
          {t('members.invite')}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={result ? t('invitations.linksTitle') : t('invitations.title')}
        description={
          result
            ? t('invitations.linksDescription')
            : t('invitations.description', { days: INVITATION_LIFETIME_DAYS })
        }
        closeLabel={t('invitations.close')}
      >
        {result ? (
          <InvitationLinks
            links={result.invitations}
            alreadyMembers={result.alreadyMembers}
            onDone={() => changeOpen(false)}
          />
        ) : (
          <InviteForm roles={roles.data ?? []} onInvited={setResult} />
        )}
      </DialogContent>
    </Dialog>
  );
}
