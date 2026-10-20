import { type ReactNode, useEffect } from 'react';
import { useI18n } from '../i18n/i18n-provider.tsx';

/** Standard page frame: a single `h1`, the browser tab title, and a width that stays readable. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.pageTitle', { page: title });
  }, [t, title]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}
