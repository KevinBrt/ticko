import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button } from '@ticko/ui';
import { LogOutIcon } from 'lucide-react';
import { useI18n } from '../../../shared/i18n/i18n-provider.tsx';
import { Session } from '../api/session.api.ts';
import { SessionQueries } from '../queries/session.queries.ts';

/** The signed-in user, with the way out. The caller decides where to go once signed out. */
export function AccountFooter({ onSignedOut }: { onSignedOut: () => Promise<void> | void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(SessionQueries.currentUser);

  const signOut = useMutation({
    mutationFn: () => Session.signOut(),
    onSuccess: async () => {
      // Nothing from this session may remain visible to the next person on this device.
      queryClient.clear();
      await onSignedOut();
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 border-t border-sidebar-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
        <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={signOut.isPending ? t('account.signingOut') : t('account.signOut')}
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
        className="-mr-2 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      >
        <LogOutIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
