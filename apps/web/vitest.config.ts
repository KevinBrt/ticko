import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Tests reach no server: the fake one answers `fetch`, and nothing is proxied, not even an
// image's address, whether a development server runs or not.
const { server: _developmentServer, ...appConfig } = viteConfig;

export default mergeConfig(
  appConfig,
  defineConfig({
    // The dev server's strict port must not apply to tests: browser suites run in parallel.
    server: { strictPort: false },
    // Found by Vite only once tests run: optimizing them then reloads the browser, and a test file
    // loading at that moment never starts (seen on a cold cache, as in CI).
    optimizeDeps: { include: ['get-nonce', 'react-dom/client'] },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test-setup.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
);
