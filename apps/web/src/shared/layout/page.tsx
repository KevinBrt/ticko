import { type ReactNode, useEffect } from 'react';
import { useI18n } from '../i18n/i18n-provider.tsx';

/**
 * Standard page frame: a single `h1` and the browser tab title. Lists and tables take the whole
 * width; forms keep a readable width of their own.
 */
export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  /** A line under the title, e.g. how many items the page holds. */
  description?: ReactNode;
  /** The page's main actions, beside the title on wide screens and under it on phones. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.pageTitle', { page: title });
  }, [t, title]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}
