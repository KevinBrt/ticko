import type { UserSummary } from '@toppo/shared';

/** What the members table shows: one role or all, and the members matching a search. */
export interface MemberFilter {
  roleId: string | null;
  search: string;
}

export const ALL_MEMBERS: MemberFilter = { roleId: null, search: '' };

/** Lower case without accents, so that "eloise" finds "Éloïse". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function filterMembers(
  members: readonly UserSummary[],
  { roleId, search }: MemberFilter,
): UserSummary[] {
  const needle = fold(search.trim());
  return members.filter(
    (member) =>
      (roleId === null || member.role.id === roleId) &&
      (needle === '' || fold(member.name).includes(needle) || fold(member.email).includes(needle)),
  );
}

/** How many members hold each role, by role id. */
export function countByRole(members: readonly UserSummary[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const member of members) {
    counts.set(member.role.id, (counts.get(member.role.id) ?? 0) + 1);
  }
  return counts;
}
