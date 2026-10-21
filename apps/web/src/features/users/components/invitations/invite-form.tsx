import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateInvitationsResponse,
  INVITATIONS_PER_REQUEST_MAX,
  type RoleBadge,
} from '@toppo/shared';
import { Alert, Button, Field, Select, Textarea } from '@toppo/ui';
import { type FormEvent, useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { Invitations } from '../../api/invitations.api.ts';
import { UsersQueries } from '../../queries/users.queries.ts';
import { parseEmails } from '../../utils/invitation-emails.util.ts';

const KNOWN_ERRORS = {
  INVALID_ROLE: 'members.invalidRole',
  SYSTEM_ROLE_RESERVED: 'members.systemRoleReserved',
} as const;

/** Addresses and a role; reports the links the server made. */
export function InviteForm({
  roles,
  onInvited,
}: {
  roles: readonly RoleBadge[];
  onInvited: (result: CreateInvitationsResponse) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [roleId, setRoleId] = useState('');
  const [errors, setErrors] = useState<{ emails?: string; role?: string }>({});

  const invite = useMutation({
    mutationFn: ({ emails }: { emails: string[] }) => Invitations.create(emails, roleId),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: UsersQueries.allMembers });
      onInvited(result);
    },
  });

  function emailsError(emails: string[], invalid: string[]): string | undefined {
    if (invalid.length > 0) {
      return t('invitations.invalidEmails', { emails: invalid.join(', ') });
    }
    if (emails.length === 0) {
      return t('validation.required');
    }
    if (emails.length > INVITATIONS_PER_REQUEST_MAX) {
      return t('invitations.tooManyEmails', { max: INVITATIONS_PER_REQUEST_MAX });
    }
    return undefined;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { emails, invalid } = parseEmails(text);
    const emailsProblem = emailsError(emails, invalid);
    // No role is preselected: nobody gets the administrator role by accident.
    const next = {
      ...(emailsProblem ? { emails: emailsProblem } : {}),
      ...(roleId ? {} : { role: t('validation.required') }),
    };
    setErrors(next);
    if (!(next.emails || next.role)) {
      invite.mutate({ emails });
    }
  }

  return (
    <form noValidate onSubmit={submit} aria-busy={invite.isPending} className="flex flex-col gap-5">
      {invite.isError ? (
        <Alert tone="danger">{requestErrorMessage(invite.error, t, KNOWN_ERRORS)}</Alert>
      ) : null}
      <Field
        label={t('invitations.emails')}
        description={t('invitations.emailsHelp', { max: INVITATIONS_PER_REQUEST_MAX })}
        error={errors.emails}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            value={text}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </Field>
      <Field label={t('invitations.role')} error={errors.role}>
        {(control) => (
          <Select {...control} value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            <option value="" disabled>
              {t('invitations.chooseRole')}
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" disabled={invite.isPending} className="self-end">
        {invite.isPending ? t('invitations.submitting') : t('invitations.submit')}
      </Button>
    </form>
  );
}
