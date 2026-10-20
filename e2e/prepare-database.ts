/**
 * Playwright starts its web server before any global setup, so the test database is
 * prepared here first. Skipped when testing an external instance (CI runs the Docker image).
 */
import { setup } from '@ticko/testing/global-setup';

if (!process.env['E2E_BASE_URL']) {
  await setup();
}
