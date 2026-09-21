import { getMigrations } from 'better-auth/db/migration';

import { createAuthInstance } from '../app/lib/auth.factory.server';

const instance = createAuthInstance();

try {
  const migrations = await getMigrations(instance.auth.options);
  const createdCount = migrations.toBeCreated.length;
  const addedCount = migrations.toBeAdded.length;

  await migrations.runMigrations();

  console.info(
    `[auth] schema migration complete: create=${createdCount} alter=${addedCount}`,
  );
} finally {
  await instance.database.end();
}
