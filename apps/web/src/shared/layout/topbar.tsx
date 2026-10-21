import { useMatches } from '@tanstack/react-router';
import { Button } from '@toppo/ui';
import { MenuIcon } from 'lucide-react';
import { useI18n } from '../i18n/i18n-provider.tsx';

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useI18n();
  const titleKey = useMatches({
    select: (matches) =>
      matches.findLast((match) => match.staticData.titleKey)?.staticData.titleKey,
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
        {titleKey ? (
          <p className="truncate text-sm font-medium text-foreground">{t(titleKey)}</p>
        ) : null}
      </div>
    </header>
  );
}
