import { checkDatabaseConnection, createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  await checkDatabaseConnection(db);
  process.stdout.write('PostgreSQL connection check passed.\n');
} finally {
  await db.destroy();
}
