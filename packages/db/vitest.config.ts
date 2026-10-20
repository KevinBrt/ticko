import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // The schema is declarative; migrations.test.ts checks it against a real database.
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/schema/**'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
