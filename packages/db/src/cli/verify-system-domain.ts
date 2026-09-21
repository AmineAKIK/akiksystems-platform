import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

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

  const error = postgresError(caught);
  assert.equal(error.code, expectedCode);
  assert.equal(error.constraint, expectedConstraint);
}

const db = createDatabase(databaseUrlFromEnv());
const firstSystemId = randomUUID();
const secondSystemId = randomUUID();
const slug = `aks-014-${randomUUID().replaceAll('-', '')}`;
const publishedAt = new Date();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db
    .insertInto('systems')
    .values({
      id: firstSystemId,
    })
    .executeTakeFirstOrThrow();

  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: firstSystemId,
        locale: 'en',
        slug,
        title: 'Sentinel',
        summary: 'Published English proof.',
        editorial_state: 'published',
        published_at: publishedAt,
      },
      {
        system_id: firstSystemId,
        locale: 'fr',
        slug,
        title: null,
        summary: null,
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .execute();

  const localizations = await db
    .selectFrom('system_localizations')
    .select([
      'locale',
      'slug',
      'editorial_state',
      'published_at',
    ])
    .where('system_id', '=', firstSystemId)
    .orderBy('locale')
    .execute();

  assert.equal(localizations.length, 2);

  const english = localizations.find(({ locale }) => locale === 'en');
  const french = localizations.find(({ locale }) => locale === 'fr');

  assert.equal(english?.slug, slug);
  assert.equal(english?.editorial_state, 'published');
  assert.ok(english?.published_at instanceof Date);

  assert.equal(french?.slug, slug);
  assert.equal(french?.editorial_state, 'draft');
  assert.equal(french?.published_at, null);

  await db
    .updateTable('systems')
    .set({
      lifecycle: 'archived',
      archived_at: new Date(),
    })
    .where('id', '=', firstSystemId)
    .executeTakeFirstOrThrow();

  const archivedSystem = await db
    .selectFrom('systems')
    .select(['lifecycle', 'archived_at'])
    .where('id', '=', firstSystemId)
    .executeTakeFirstOrThrow();

  assert.equal(archivedSystem.lifecycle, 'archived');
  assert.ok(archivedSystem.archived_at instanceof Date);

  const stillPublished = await db
    .selectFrom('system_localizations')
    .select('editorial_state')
    .where('system_id', '=', firstSystemId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(stillPublished.editorial_state, 'published');

  await db
    .insertInto('systems')
    .values({
      id: secondSystemId,
    })
    .executeTakeFirstOrThrow();

  await expectPostgresError(
    '23505',
    'system_localizations_locale_slug_key',
    () =>
      db
        .insertInto('system_localizations')
        .values({
          system_id: secondSystemId,
          locale: 'en',
          slug,
          editorial_state: 'draft',
          published_at: null,
          title: null,
          summary: null,
        })
        .execute(),
  );

  await expectPostgresError(
    '23514',
    'systems_lifecycle_archive_check',
    () =>
      sql`
        update systems
        set lifecycle = 'deleted'
        where id = ${secondSystemId}::uuid
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_localizations_locale_check',
    () =>
      sql`
        insert into system_localizations (
          system_id,
          locale,
          editorial_state
        ) values (
          ${secondSystemId}::uuid,
          'de',
          'draft'
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_localizations_editorial_publication_check',
    () =>
      sql`
        insert into system_localizations (
          system_id,
          locale,
          editorial_state,
          published_at
        ) values (
          ${secondSystemId}::uuid,
          'fr',
          'published',
          null
        )
      `.execute(db),
  );

  await db.deleteFrom('systems').where('id', '=', firstSystemId).execute();

  const cascadedLocalizations = await db
    .selectFrom('system_localizations')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('system_id', '=', firstSystemId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(cascadedLocalizations.count), 0);

  process.stdout.write(
    'System domain verification passed: shared identity, independent localization publication, locale-scoped unique slugs, lifecycle separation, and database constraints are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', 'in', [
    firstSystemId,
    secondSystemId,
  ]).execute();
  await db.destroy();
}
