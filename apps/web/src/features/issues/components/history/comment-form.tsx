import { useMutation } from '@tanstack/react-query';
import { COMMENT_BODY_MAX_LENGTH, type UserRef } from '@toppo/shared';
import { Alert, Button } from '@toppo/ui';
import { SendIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { requestErrorMessage } from '../../../../shared/forms/form-errors.util.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { Comments } from '../../api/comments.api.ts';
import { COMMENT_ERRORS } from '../../constants/comments.constants.ts';

/**
 * The way to comment, above the history: plain text in a card, addressed to whoever reported
 * the issue, and one button to send it. Reports the comment once sent, and empties itself.
 */
export function CommentForm({
  issueKey,
  replyTo,
  onCommented,
}: {
  issueKey: string;
  /** Whom the comment answers: the reporter, unless it is the reader. */
  replyTo: UserRef | null;
  onCommented: () => Promise<void>;
}) {
  const { t } = useI18n();
  const fieldId = useId();
  const [body, setBody] = useState('');
  const add = useMutation({
    mutationFn: (text: string) => Comments.add(issueKey, text),
    onSuccess: async () => {
      setBody('');
      await onCommented();
    },
  });
  const firstName = replyTo?.name?.split(' ')[0];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim() !== '') {
          add.mutate(body);
        }
      }}
      className="flex flex-col gap-3"
    >
      {add.isError ? (
        <Alert tone="danger">{requestErrorMessage(add.error, t, COMMENT_ERRORS)}</Alert>
      ) : null}
      <div className="rounded-xl border border-border bg-surface shadow-xs transition-colors has-[textarea:focus-visible]:border-primary has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-ring/30">
        <label htmlFor={fieldId} className="sr-only">
          {t('issues.comments.add')}
        </label>
        <textarea
          id={fieldId}
          value={body}
          rows={3}
          maxLength={COMMENT_BODY_MAX_LENGTH}
          placeholder={
            firstName
              ? t('issues.comments.replyTo', { name: firstName })
              : t('issues.comments.placeholder')
          }
          onChange={(event) => setBody(event.target.value)}
          className="block min-h-20 w-full resize-y rounded-t-xl bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-base"
        />
        <div className="flex justify-end px-3 pb-3">
          <Button type="submit" disabled={body.trim() === '' || add.isPending}>
            <SendIcon aria-hidden="true" />
            {add.isPending ? t('issues.comments.sending') : t('issues.comments.send')}
          </Button>
        </div>
      </div>
    </form>
  );
}
