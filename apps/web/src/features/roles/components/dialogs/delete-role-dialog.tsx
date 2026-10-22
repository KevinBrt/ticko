import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RoleDetails } from '@toppo/shared';
import { Alert, Button, Dialog, DialogClose, DialogContent } from '@toppo/ui';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import type { Translate } from '../../../../shared/i18n/i18n.types.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';
import { Roles } from '../../api/roles.api.ts';
import { RolesQueries } from '../../queries/roles.queries.ts';

const KNOWN_ERRORS = {
  ROLE_IN_USE: 'roles.roleInUse',
  ROLE_NOT_FOUND: 'roles.roleNotFound',
  SYSTEM_ROLE_LOCKED: 'roles.systemRoleLocked',
} as const;

/**
 * Deletes a role after confirming. A role someone still has cannot be: the dialog says who, so
 * that the administrator gives them another role first.
 */
export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
  onClosed,
}: {
  role: RoleDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes back once the dialog is closed, e.g. the menu that opened it. */
  onClosed: () => void;
}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const holders = holdersOf(role, t, (count) => pluralForm(locale, count));

  const remove = useMutation({
    mutationFn: () => Roles.delete(role.id),
    onSuccess: async () => {
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: RolesQueries.all.queryKey });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        remove.reset();
      }}
    >
      <DialogContent
        title={t('roles.deleteTitle', { role: role.name })}
        description={holders ? t('roles.deleteBlocked', { holders }) : t('roles.deleteDescription')}
        closeLabel={t('roles.close')}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onClosed();
        }}
      >
        <div className="flex flex-col gap-4">
          {remove.isError ? (
            <Alert tone="danger">{requestErrorMessage(remove.error, t, KNOWN_ERRORS)}</Alert>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary">
                {holders ? t('roles.understood') : t('roles.cancel')}
              </Button>
            </DialogClose>
            {holders ? null : (
              <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>
                {t('roles.deleteConfirm')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "3 members and 1 pending invitation", or `undefined` when nobody has the role. */
function holdersOf(
  { memberCount, invitationCount }: RoleDetails,
  t: Translate,
  form: (count: number) => 'one' | 'other',
): string | undefined {
  const members = t(`roles.holders.members.${form(memberCount)}`, { count: memberCount });
  const invitations = t(`roles.holders.invitations.${form(invitationCount)}`, {
    count: invitationCount,
  });
  if (memberCount > 0 && invitationCount > 0) {
    return t('roles.holders.both', { members, invitations });
  }
  if (memberCount > 0) {
    return members;
  }
  return invitationCount > 0 ? invitations : undefined;
}
