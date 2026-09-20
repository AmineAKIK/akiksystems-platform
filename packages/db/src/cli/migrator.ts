import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FileMigrationProvider, Migrator, type Kysely } from 'kysely';

import type { Database } from '../schema.js';

const migrationFolder = fileURLToPath(new URL('../migrations', import.meta.url));

export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });
}

export function reportMigrationResults(
  results: readonly { migrationName: string; status: string }[] | undefined,
): void {
  if (results === undefined || results.length === 0) {
    process.stdout.write('No migration changes were required.\n');
    return;
  }

  for (const result of results) {
    process.stdout.write(`${result.status}: ${result.migrationName}\n`);
  }
}
