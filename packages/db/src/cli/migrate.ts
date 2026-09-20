import { checkDatabaseConnection, createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

type MigrationCommand = 'latest' | 'down';

function migrationCommandFromArgs(): MigrationCommand {
  const command = process.argv[2] ?? 'latest';

  if (command === 'latest' || command === 'down') {
    return command;
  }

  throw new Error(`Unsupported migration command: ${command}. Use "latest" or "down".`);
}

const db = createDatabase(databaseUrlFromEnv());

try {
  await checkDatabaseConnection(db);

  const migrator = createMigrator(db);
  const command = migrationCommandFromArgs();
  const migrationResult =
    command === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest();

  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }
} finally {
  await db.destroy();
}
