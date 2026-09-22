import { bootstrapSystemPublications } from '../system-publication.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const result = await bootstrapSystemPublications(db);
  process.stdout.write(
    `System publication bootstrap completed: ${result.created} snapshot(s) created.\n`,
  );
} finally {
  await db.destroy();
}
