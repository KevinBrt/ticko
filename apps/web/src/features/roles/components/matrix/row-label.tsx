import type { PlainMessageKey } from '../../../../shared/i18n/i18n.types.ts';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { PERMISSION_MESSAGES } from '../../constants/permission-messages.constants.ts';
import type { MatrixRow } from '../../utils/permission-matrix.util.ts';

function messagesOf(row: MatrixRow): { label: PlainMessageKey; description: PlainMessageKey } {
  return row.kind === 'issueVisibility'
    ? { label: 'roles.visibility.label', description: 'roles.visibility.description' }
    : PERMISSION_MESSAGES[row.permission];
}

/** What a row of the matrix allows, and a line of help. */
export function RowLabel({ row }: { row: MatrixRow }) {
  const { t } = useI18n();
  const { label, description } = messagesOf(row);

  return (
    <>
      <span className="block text-sm font-medium text-foreground">{t(label)}</span>
      <span className="block text-xs font-normal text-muted-foreground">{t(description)}</span>
    </>
  );
}
