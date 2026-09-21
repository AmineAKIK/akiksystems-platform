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

  const profileId = profiles[0]?.id;
  assert.ok(profileId);

  const portraitId = randomUUID();
  await db
    .insertInto('assets')
    .values({
      id: portraitId,
      storage_key: `qualification/profile/${portraitId}.webp`,
      original_filename: 'profile.webp',
      mime_type: 'image/webp',
      byte_size: 128,
    })
    .execute();

  await db
    .insertInto('asset_localizations')
    .values([
      {
        asset_id: portraitId,
        locale: 'en',
        alt_text: 'Professional portrait',
        caption: null,
      },
      {
        asset_id: portraitId,
        locale: 'fr',
        alt_text: 'Portrait professionnel',
        caption: null,
      },
    ])
    .execute();

  await db
    .updateTable('profiles')
    .set({
      display_name: 'Qualification Person',
      portrait_asset_id: portraitId,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await db
    .updateTable('profile_localizations')
    .set({
      professional_title: 'Software systems builder',
      introduction: 'English introduction.',
      foundational_copy: 'English foundational copy.',
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  await db
    .updateTable('profile_localizations')
    .set({
      professional_title: 'Concepteur de systèmes logiciels',
      introduction: 'Introduction française.',
      foundational_copy: 'Texte fondateur français.',
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .where('locale', '=', 'fr')
    .executeTakeFirstOrThrow();

  const administeredEnglish = await getPublicProfile(db, 'en');
  const administeredFrench = await getPublicProfile(db, 'fr');
  assert.ok(administeredEnglish);
  assert.ok(administeredFrench);
  assert.equal(administeredEnglish.displayName, 'Qualification Person');
  assert.equal(administeredFrench.displayName, 'Qualification Person');
  assert.equal(administeredEnglish.professionalTitle, 'Software systems builder');
  assert.equal(
    administeredFrench.professionalTitle,
    'Concepteur de systèmes logiciels',
  );
  assert.equal(administeredEnglish.portraitAssetId, portraitId);
  assert.equal(administeredEnglish.portraitAltText, 'Professional portrait');
  assert.equal(
    administeredFrench.portraitAltText,
    'Portrait professionnel',
  );

  await db
    .updateTable('profiles')
    .set({
      display_name: null,
      portrait_asset_id: null,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await db
    .updateTable('profile_localizations')
    .set({
      professional_title: null,
      introduction: null,
      foundational_copy: null,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .execute();

  await db.deleteFrom('assets').where('id', '=', portraitId).execute();

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
    'Public Profile verification passed: singleton identity, editable shared/localized identity, localized portrait metadata, public reads, and database constraints are enforced.\n',
  );
} finally {
  await db.destroy();
}
