import { canAny } from '@toppo/core';
import type { NavSection } from './navigation.constants.ts';

/** The sections and links a user may use; a section left without links disappears. */
export function visibleSections(
  sections: readonly NavSection[],
  permissions: readonly string[],
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiresAnyOf || canAny(permissions, item.requiresAnyOf),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
