import { Link, useMatches } from '@tanstack/react-router';
import { Button } from '@toppo/ui';
import { MenuIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';

type RoutePath = ReturnType<typeof useMatches>[number]['fullPath'];
/** Index routes (`/settings/`) never carry a title, so they are never a step of the path. */
type StepPath = Exclude<RoutePath, `${string}/`> | '/';

function isStepPath(path: RoutePath): path is StepPath {
  return path === '/' || !path.endsWith('/');
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useI18n();
  // Every matched route with a title is a step of the path: Projects / WEB / Settings.
  const crumbs = useMatches().flatMap((match) => {
    const path: RoutePath = match.fullPath;
    const { titleKey, crumbParam } = match.staticData;
    const params: Readonly<Record<string, string | undefined>> = match.params;
    const label = titleKey ? t(titleKey) : crumbParam && params[crumbParam];
    return label && isStepPath(path) ? [{ id: match.id, to: path, label }] : [];
  });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 lg:hidden"
          aria-label={t('nav.openMenu')}
          onClick={onOpenMenu}
        >
          <MenuIcon aria-hidden="true" />
        </Button>
        {crumbs.length > 0 ? (
          <nav aria-label={t('nav.breadcrumb')} className="min-w-0">
            <ol className="flex items-center gap-1.5 text-sm">
              {crumbs.map((crumb, index) =>
                index === crumbs.length - 1 ? (
                  <li key={crumb.id} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 ? <Separator /> : null}
                    <span aria-current="page" className="truncate font-medium text-foreground">
                      {crumb.label}
                    </span>
                  </li>
                ) : (
                  <li key={crumb.id} className="flex shrink-0 items-center gap-1.5">
                    {index > 0 ? <Separator /> : null}
                    {/* Every step is a parent of this page: the current parameters fill its path. */}
                    <Link
                      to={crumb.to}
                      params={true}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  </li>
                ),
              )}
            </ol>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-muted-foreground">
      /
    </span>
  );
}
