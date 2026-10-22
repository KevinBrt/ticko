import { type ReactNode, useId } from 'react';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { pluralForm } from '../../../../shared/i18n/plural.util.ts';

/** A panel's list of options: its heading and count, then the options in one frame. */
export function OptionsSection({ count, children }: { count: number; children: ReactNode }) {
  const { t, locale } = useI18n();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={titleId} className="text-sm font-medium text-foreground">
          {t('properties.optionsTitle')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t(`properties.options.${pluralForm(locale, count)}`, { count })}
        </span>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {children}
      </div>
    </section>
  );
}
