import { Button } from '@toppo/ui';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../shared/i18n/plural.util.ts';

/** "3 unsaved changes", with the way to save or discard them, kept in view at the bottom. */
export function UnsavedChangesBar({
  count,
  saving,
  onSave,
  onDiscard,
}: {
  count: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="sticky bottom-0 z-20 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:pl-4">
        <p className="text-sm font-medium text-foreground">
          {t(`roles.unsaved.${pluralForm(locale, count)}`, { count })}
        </p>
        <div className="flex gap-2 self-end sm:self-auto">
          <Button variant="secondary" disabled={saving} onClick={onDiscard}>
            {t('roles.discard')}
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? t('roles.saving') : t('roles.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
