import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';

import type { Database } from './schema.js';

export function createDatabase(connectionString: string): Kysely<Database> {
  if (connectionString.trim() === '') {
    throw new Error('A non-empty PostgreSQL connection string is required.');
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}

export async function checkDatabaseConnection(db: Kysely<Database>): Promise<void> {
  const result = await sql<{ ok: boolean }>`select true as ok`.execute(db);

  if (result.rows[0]?.ok !== true) {
    throw new Error('PostgreSQL connectivity probe returned an unexpected result.');
  }
}
