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
const systemId = randomUUID();
const experienceId = randomUUID();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db.insertInto('experiences').values({ id: experienceId }).execute();

  await db
    .insertInto('experience_localizations')
    .values([
      {
        experience_id: experienceId,
        locale: 'en',
        title: 'Marelli',
        summary: 'Industrial origin context for Sentinel.',
      },
      {
        experience_id: experienceId,
        locale: 'fr',
        title: 'Marelli',
        summary: 'Contexte industriel à l’origine de Sentinel.',
      },
    ])
    .execute();

  await db
    .insertInto('system_experiences')
    .values({
      system_id: systemId,
      experience_id: experienceId,
      relation_kind: 'origin_context',
    })
    .execute();

  const linked = await db
    .selectFrom('system_experiences')
    .innerJoin(
      'experience_localizations',
      (join) =>
        join
          .onRef(
            'experience_localizations.experience_id',
            '=',
            'system_experiences.experience_id',
          )
          .on('experience_localizations.locale', '=', 'en'),
    )
    .select([
      'system_experiences.relation_kind',
      'experience_localizations.title',
      'experience_localizations.summary',
    ])
    .where('system_experiences.system_id', '=', systemId)
    .executeTakeFirstOrThrow();

  assert.equal(linked.relation_kind, 'origin_context');
  assert.equal(linked.title, 'Marelli');
  assert.equal(linked.summary, 'Industrial origin context for Sentinel.');

  const localizationCount = await db
    .selectFrom('experience_localizations')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('experience_id', '=', experienceId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(localizationCount.count), 2);

  await expectPostgresError(
    '23505',
    'system_experiences_pkey',
    () =>
      db
        .insertInto('system_experiences')
        .values({
          system_id: systemId,
          experience_id: experienceId,
          relation_kind: 'origin_context',
        })
        .execute(),
  );

  await expectPostgresError(
    '23514',
    'experience_localizations_locale_check',
    () =>
      sql`
        insert into experience_localizations (
          experience_id,
          locale,
          title
        ) values (
          ${experienceId}::uuid,
          'de',
          'Marelli'
        )
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_experiences_relation_kind_check',
    () =>
      sql`
        insert into system_experiences (
          system_id,
          experience_id,
          relation_kind
        ) values (
          ${systemId}::uuid,
          ${experienceId}::uuid,
          'employment'
        )
      `.execute(db),
  );

  await db.deleteFrom('experiences').where('id', '=', experienceId).execute();

  const relationCount = await db
    .selectFrom('system_experiences')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('system_id', '=', systemId)
    .executeTakeFirstOrThrow();

  assert.equal(Number(relationCount.count), 0);

  process.stdout.write(
    'Experience context verification passed: localized content is stored once, typed System relations resolve shared context, and constraints/cascades are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.deleteFrom('experiences').where('id', '=', experienceId).execute();
  await db.destroy();
}
