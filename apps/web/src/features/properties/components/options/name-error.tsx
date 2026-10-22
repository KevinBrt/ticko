import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import type { NameProblem } from '../../utils/option-drafts.util.ts';

/** Why an option's name cannot be saved, under it and announced with its field. */
export function NameError({ id, problem, max }: { id: string; problem: NameProblem; max: number }) {
  const { t } = useI18n();
  const messages: Record<NameProblem, string> = {
    blank: t('properties.blank'),
    tooLong: t('validation.tooLong', { max }),
    duplicate: t('properties.duplicate'),
  };

  return (
    <p id={id} className="px-2 pb-1 text-xs font-medium text-danger">
      {messages[problem]}
    </p>
  );
}
