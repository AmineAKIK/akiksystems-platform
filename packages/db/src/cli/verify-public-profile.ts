import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { getPublicProfile } from '../public-profile.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

interface PostgreSqlError {
  code?: string;
  constraint?: string;
}

const db = createDatabase(databaseUrlFromEnv());

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  const profiles = await db.selectFrom('profiles').selectAll().execute();
  assert.equal(profiles.length, 1, 'Exactly one public Profile must exist.');
  assert.equal(profiles[0]?.singleton_key, 'public');

  const localizations = await db
    .selectFrom('profile_localizations')
    .select(['locale'])
    .orderBy('locale')
    .execute();
  assert.deepEqual(localizations.map(({ locale }) => locale), ['en', 'fr']);

  const english = await getPublicProfile(db, 'en');
  const french = await getPublicProfile(db, 'fr');
  assert.ok(english);
  assert.ok(french);
  assert.equal(english.id, french.id, 'EN/FR must share one Profile identity.');
  assert.equal(english.alternateLocale, 'fr');
  assert.equal(french.alternateLocale, 'en');

  let duplicateError: unknown;
  try {
    await db
      .insertInto('profiles')
      .values({ id: randomUUID(), singleton_key: 'public' })
      .execute();
  } catch (error) {
    duplicateError = error;
  }
  assert.ok(duplicateError && typeof duplicateError === 'object');
  assert.equal((duplicateError as PostgreSqlError).code, '23505');
  assert.equal(
    (duplicateError as PostgreSqlError).constraint,
    'profiles_singleton_key_key',
  );

  let localeError: unknown;
  try {
    await sql`
      insert into profile_localizations (profile_id, locale)
      values (${profiles[0]?.id}::uuid, 'de')
    `.execute(db);
  } catch (error) {
    localeError = error;
  }
  assert.ok(localeError && typeof localeError === 'object');
  assert.equal((localeError as PostgreSqlError).code, '23514');
  assert.equal(
    (localeError as PostgreSqlError).constraint,
    'profile_localizations_locale_check',
  );

  process.stdout.write(
    'Public Profile verification passed: singleton identity, EN/FR localizations, localized public reads, and database constraints are enforced.\n',
  );
} finally {
  await db.destroy();
}
