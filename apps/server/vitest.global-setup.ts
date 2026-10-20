import { fileURLToPath } from 'node:url';
import { createDatabase } from '@ticko/db';
import { prepareTemplateDatabase } from '@ticko/testing';
import type { TestProject } from 'vitest/node';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../packages/db/migrations', import.meta.url));

export async function setup(project: TestProject): Promise<void> {
  const template = await prepareTemplateDatabase({
    name: 'ticko_test_server',
    migrate: async (url) => {
      const database = createDatabase({ url, maxConnections: 1 });
      try {
        await database.migrate(MIGRATIONS_FOLDER);
      } finally {
        await database.close();
      }
    },
  });
  project.provide('testTemplateDatabase', template);
}
