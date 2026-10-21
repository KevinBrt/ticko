import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/i18n-provider.tsx';
import type { NavSection } from './navigation.constants.ts';

/**
 * A part of the app with its own navigation, like the settings: a column beside the page on wide
 * screens, a row of links above it on smaller ones.
 */
export function SectionLayout({
  label,
  sections,
  children,
}: {
  /** Accessible name of the navigation. */
  label: string;
  sections: readonly NavSection[];
  children: ReactNode;
}) {
  const { t } = useI18n();

  if (sections.length === 0) {
    return children;
  }
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
      <nav aria-label={label} className="lg:w-52 lg:shrink-0">
        {sections.map((section) => (
          <div key={section.labelKey ?? 'main'} className="lg:mb-5">
            {section.labelKey ? (
              <p className="hidden px-3 pb-2 text-xs font-medium text-muted-foreground lg:block">
                {t(section.labelKey)}
              </p>
            ) : null}
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {section.items.map(({ to, labelKey }) => (
                <li key={to} className="shrink-0">
                  <Link
                    to={to}
                    className="flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11 data-[status=active]:bg-primary-subtle data-[status=active]:text-primary-subtle-foreground"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
