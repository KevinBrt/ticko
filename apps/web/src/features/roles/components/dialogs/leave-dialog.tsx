import { Button, Dialog, DialogContent } from '@toppo/ui';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';

/** Asks before leaving the matrix with unsaved changes. */
export function LeaveDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onStay())}>
      <DialogContent
        title={t('roles.leaveTitle')}
        description={t('roles.leaveDescription')}
        closeLabel={t('roles.close')}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onStay}>
            {t('roles.stay')}
          </Button>
          <Button variant="danger" onClick={onLeave}>
            {t('roles.leave')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
