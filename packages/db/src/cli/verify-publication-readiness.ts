import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { validateSystemPublicationReadiness } from '@akiksystems/core';
import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

interface PostgreSqlError {
  code?: string;
  constraint?: string;
}

function postgresError(error: unknown): PostgreSqlError {
  assert.ok(error !== null && typeof error === 'object');
  return error as PostgreSqlError;
}

async function expectPostgresError(
  expectedCode: string,
  expectedConstraint: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  let caught: unknown;

  try {
    await operation();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught !== undefined, `Expected PostgreSQL error ${expectedCode}.`);

  const postgres = postgresError(caught);
  assert.equal(postgres.code, expectedCode);
  assert.equal(postgres.constraint, expectedConstraint);
}

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db
    .insertInto('system_localizations')
    .values({
      system_id: systemId,
      locale: 'en',
      slug: null,
      title: null,
      summary: null,
      presentation_document: null,
    })
    .execute();

  const incomplete = validateSystemPublicationReadiness({
    slug: null,
    title: null,
    summary: null,
    presentationDocument: null,
  });

  assert.equal(incomplete.ready, false);
  assert.equal(incomplete.errors.length, 4);

  await expectPostgresError(
    '23514',
    'system_localizations_publication_readiness_check',
    () =>
      db
        .updateTable('system_localizations')
        .set({
          editorial_state: 'published',
          published_at: new Date(),
        })
        .where('system_id', '=', systemId)
        .where('locale', '=', 'en')
        .execute(),
  );

  const validDocument = {
    version: 1 as const,
    blocks: [
      {
        type: 'paragraph' as const,
        text: 'Sentinel provides operational visibility.',
      },
    ],
  };

  await db
    .updateTable('system_localizations')
    .set({
      slug: 'sentinel',
      title: 'Sentinel',
      summary: 'Operational visibility system.',
      presentation_document: validDocument,
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .execute();

  const complete = validateSystemPublicationReadiness({
    slug: 'sentinel',
    title: 'Sentinel',
    summary: 'Operational visibility system.',
    presentationDocument: validDocument,
  });

  assert.equal(complete.ready, true);
  assert.deepEqual(complete.errors, []);

  await db
    .updateTable('system_localizations')
    .set({
      editorial_state: 'published',
      published_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .execute();

  const published = await db
    .selectFrom('system_localizations')
    .select(['editorial_state', 'published_at'])
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(published.editorial_state, 'published');
  assert.ok(published.published_at instanceof Date);

  await expectPostgresError(
    '23514',
    'system_localizations_publication_readiness_check',
    () =>
      sql`
        update system_localizations
        set summary = '   '
        where system_id = ${systemId}::uuid
          and locale = 'en'
      `.execute(db),
  );

  process.stdout.write(
    'Publication readiness verification passed: incomplete localizations cannot publish, complete localizations can, and published content cannot become incomplete.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.destroy();
}
