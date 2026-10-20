import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

interface Fixtures {
  /** Fails the test on any console error or uncaught exception, CSP violations included. */
  failOnConsoleErrors: undefined;
}

export const test = base.extend<Fixtures>({
  failOnConsoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await use(undefined);
      expect(errors, 'console errors').toStrictEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Runs axe against WCAG 2.2 AA and fails on any violation. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toStrictEqual([]);
}

/** Opens the navigation: directly on desktop, through the drawer on phones. */
export async function openNavigation(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    return page.getByRole('dialog', { name: 'Main navigation' });
  }
  return page.getByRole('navigation', { name: 'Main navigation' });
}
