import { canBeGranted, type Permission } from '@toppo/core';
import type { RoleDetails } from '@toppo/shared';
import { Select, Switch } from '@toppo/ui';
import { useI18n } from '../../../../shared/i18n/i18n-provider.tsx';
import { PERMISSION_MESSAGES } from '../../constants/permission-messages.constants.ts';
import {
  ISSUE_VISIBILITIES,
  issueVisibilityOf,
  type MatrixRow,
  withIssueVisibility,
  withPermission,
} from '../../utils/permission-matrix.util.ts';

/**
 * The control of one row for one role: a switch, or the issue visibility. Locked for the system
 * role, which has everything, and for permissions only the system role may hold.
 */
export function PermissionControl({
  row,
  role,
  permissions,
  onChange,
}: {
  row: MatrixRow;
  role: RoleDetails;
  /** What the role grants in the matrix, saved or not. */
  permissions: readonly Permission[];
  onChange: (permissions: Permission[]) => void;
}) {
  const { t } = useI18n();

  if (row.kind === 'issueVisibility') {
    return (
      <Select
        aria-label={t('roles.controlFor', {
          permission: t('roles.visibility.label'),
          role: role.name,
        })}
        value={issueVisibilityOf(permissions)}
        disabled={role.grantsAll}
        onChange={(event) => {
          const visibility = ISSUE_VISIBILITIES.find((option) => option === event.target.value);
          if (visibility) {
            onChange(withIssueVisibility(permissions, visibility));
          }
        }}
        className="h-9 min-w-28 pointer-coarse:h-11"
      >
        {ISSUE_VISIBILITIES.map((option) => (
          <option key={option} value={option}>
            {t(`roles.visibility.${option}`)}
          </option>
        ))}
      </Select>
    );
  }

  const { permission } = row;
  return (
    <Switch
      aria-label={t('roles.controlFor', {
        permission: t(PERMISSION_MESSAGES[permission].label),
        role: role.name,
      })}
      checked={permissions.includes(permission)}
      disabled={role.grantsAll || !canBeGranted(permission)}
      onCheckedChange={(granted) => onChange(withPermission(permissions, permission, granted))}
    />
  );
}
