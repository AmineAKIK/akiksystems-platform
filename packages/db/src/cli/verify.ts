import { checkDatabaseConnection, createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  await checkDatabaseConnection(db);

  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db
    .selectFrom('system_metadata')
    .select(['key', 'created_at'])
    .limit(1)
    .execute();

  process.stdout.write('Typed Kysely database verification passed.\n');
} finally {
  await db.destroy();
}
