import type { z } from 'zod';
import { ApiRequestError } from '../api/http.client.ts';
import type { PlainMessageKey, Translate } from '../i18n/i18n.types.ts';

/** Translated message per field path (`admin.email`), keeping the first problem of each field. */
export function fieldErrors(error: z.ZodError, t: Translate): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    messages[path] ??= issueMessage(issue, t);
  }
  return messages;
}

function issueMessage(issue: z.core.$ZodIssue, t: Translate): string {
  switch (issue.code) {
    case 'too_small':
      return Number(issue.minimum) <= 1
        ? t('validation.required')
        : t('validation.tooShort', { min: Number(issue.minimum) });
    case 'too_big':
      return t('validation.tooLong', { max: Number(issue.maximum) });
    case 'invalid_format':
      return issue.format === 'email' ? t('validation.email') : t('validation.invalid');
    default:
      return t('validation.invalid');
  }
}

/** Message for a failed request: specific when the code is known, generic otherwise. */
export function requestErrorMessage(
  error: unknown,
  t: Translate,
  known: Readonly<Record<string, PlainMessageKey>> = {},
): string {
  if (!(error instanceof ApiRequestError)) {
    return t('errors.unexpected');
  }
  const key = known[error.code];
  if (key) {
    return t(key);
  }
  if (error.code === 'NETWORK_ERROR') {
    return t('errors.network');
  }
  if (error.code === 'TOO_MANY_REQUESTS') {
    return t('errors.tooManyRequests');
  }
  return t('errors.unexpected');
}
