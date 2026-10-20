import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from '@ticko/testing';

const isCI = Boolean(process.env['CI']);

/**
 * Two ways to run:
 * - `E2E_BASE_URL` set (CI): tests the Docker image started with docker/docker-compose.yml.
 * - otherwise: starts the locally built server (`npm run build` first) on port 3100.
 */
const externalBaseUrl = process.env['E2E_BASE_URL'];
const LOCAL_PORT = 3100;
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${LOCAL_PORT}`;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Device-specific tests are tagged instead of skipped at runtime.
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile-only/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grepInvert: /@desktop-only/ },
  ],
  ...(externalBaseUrl
    ? {}
    : {
        webServer: {
          command: 'node --enable-source-maps ../apps/server/dist/main.js',
          url: `${baseURL}/health`,
          reuseExistingServer: !isCI,
          env: {
            TICKO_DATABASE_URL: testDatabaseUrl(),
            TICKO_HOST: '127.0.0.1',
            TICKO_PORT: String(LOCAL_PORT),
            TICKO_URL: baseURL,
            TICKO_LOG_LEVEL: 'warn',
          },
        },
      }),
});
