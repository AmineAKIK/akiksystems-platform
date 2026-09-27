import pg from 'pg';

const confirmation = process.env.AKIKSYSTEMS_ALLOW_DATABASE_RESET;
const environment = process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV;
const databaseUrl = process.env.DATABASE_URL;

if (confirmation !== 'PROFILE_CLEAN_REBUILD_2026_09_27') {
  throw new Error(
    'Production database reset refused: explicit one-shot confirmation is missing.',
  );
}

if (environment !== 'production') {
  throw new Error(
    `Production database reset refused: expected production environment, received ${environment ?? 'unknown'}.`,
  );
}

if (databaseUrl === undefined || databaseUrl.trim() === '') {
  throw new Error('Production database reset refused: DATABASE_URL is missing.');
}

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const migrationRows = await client.query<{ name: string }>(
    'select name from kysely_migration order by name',
  );
  const migrationNames = migrationRows.rows.map((row) => row.name);
  const expectedLegacyMarker =
    '20260922_011_create_profile_work_principles';

  if (!migrationNames.includes(expectedLegacyMarker)) {
    throw new Error(
      `Production database reset refused: expected legacy migration marker ${expectedLegacyMarker} was not found.`,
    );
  }

  console.info(
    `[db-reset] verified legacy Profile migration history (${migrationNames.length} recorded migrations).`,
  );

  await client.query('begin');
  await client.query('drop schema public cascade');
  await client.query('create schema public');
  await client.query('commit');

  const remaining = await client.query<{ table_name: string }>(
    [
      "select table_name",
      "from information_schema.tables",
      "where table_schema = 'public'",
      'order by table_name',
    ].join(' '),
  );

  if (remaining.rows.length !== 0) {
    throw new Error(
      `Production database reset verification failed: public schema still contains ${remaining.rows.length} tables.`,
    );
  }

  console.info(
    '[db-reset] production public schema recreated and verified empty.',
  );
} catch (error) {
  try {
    await client.query('rollback');
  } catch {
    // The transaction may already be committed or the connection may be unavailable.
  }
  throw error;
} finally {
  await client.end();
}
