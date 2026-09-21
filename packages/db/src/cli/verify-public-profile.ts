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


  const firstPrincipleId = randomUUID();
  const secondPrincipleId = randomUUID();

  await db
    .insertInto('profile_work_principles')
    .values([
      {
        id: firstPrincipleId,
        profile_id: profileId,
        position: 0,
      },
      {
        id: secondPrincipleId,
        profile_id: profileId,
        position: 1,
      },
    ])
    .execute();

  await db
    .insertInto('profile_work_principle_localizations')
    .values([
      {
        principle_id: firstPrincipleId,
        locale: 'en',
        title: 'Make evidence inspectable',
        detail: 'Prefer concrete proof over opaque claims.',
      },
      {
        principle_id: firstPrincipleId,
        locale: 'fr',
        title: 'Rendre les preuves inspectables',
        detail: 'Privilégier des preuves concrètes aux affirmations opaques.',
      },
      {
        principle_id: secondPrincipleId,
        locale: 'en',
        title: 'Reduce before adding',
        detail: null,
      },
      {
        principle_id: secondPrincipleId,
        locale: 'fr',
        title: 'Réduire avant d’ajouter',
        detail: null,
      },
    ])
    .execute();

  const englishWithPrinciples = await getPublicProfile(db, 'en');
  const frenchWithPrinciples = await getPublicProfile(db, 'fr');
  assert.ok(englishWithPrinciples);
  assert.ok(frenchWithPrinciples);
  assert.deepEqual(
    englishWithPrinciples.workPrinciples.map(({ title }) => title),
    ['Make evidence inspectable', 'Reduce before adding'],
  );
  assert.deepEqual(
    frenchWithPrinciples.workPrinciples.map(({ title }) => title),
    ['Rendre les preuves inspectables', 'Réduire avant d’ajouter'],
  );
  assert.equal(
    englishWithPrinciples.workPrinciples[0]?.detail,
    'Prefer concrete proof over opaque claims.',
  );
  assert.equal(frenchWithPrinciples.workPrinciples[1]?.detail, null);

  await db
    .deleteFrom('profile_work_principles')
    .where('profile_id', '=', profileId)
    .execute();


  const firstSystemId = randomUUID();
  const secondSystemId = randomUUID();
  const presentation = {
    version: 1 as const,
    blocks: [{ type: 'paragraph' as const, text: 'Published proof.' }],
  };

  await db
    .insertInto('systems')
    .values([
      { id: firstSystemId, lifecycle: 'active' },
      { id: secondSystemId, lifecycle: 'active' },
    ])
    .execute();

  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: firstSystemId,
        locale: 'en',
        slug: 'profile-proof-one',
        title: 'Profile Proof One',
        summary: 'English summary one.',
        presentation_document: presentation,
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: firstSystemId,
        locale: 'fr',
        slug: 'preuve-profil-un',
        title: 'Preuve Profil Un',
        summary: 'Résumé français un.',
        presentation_document: presentation,
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: secondSystemId,
        locale: 'en',
        slug: 'profile-proof-two',
        title: 'Profile Proof Two',
        summary: 'English summary two.',
        presentation_document: presentation,
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: secondSystemId,
        locale: 'fr',
        slug: 'preuve-profil-deux',
        title: 'Preuve Profil Deux',
        summary: 'Résumé français deux.',
        presentation_document: presentation,
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .execute();

  await db
    .insertInto('profile_systems')
    .values([
      {
        profile_id: profileId,
        system_id: secondSystemId,
        position: 0,
      },
      {
        profile_id: profileId,
        system_id: firstSystemId,
        position: 1,
      },
    ])
    .execute();

  const englishWithSystems = await getPublicProfile(db, 'en');
  const frenchWithSystems = await getPublicProfile(db, 'fr');
  assert.ok(englishWithSystems);
  assert.ok(frenchWithSystems);
  assert.deepEqual(
    englishWithSystems.representativeSystems.map(({ title }) => title),
    ['Profile Proof Two', 'Profile Proof One'],
  );
  assert.deepEqual(
    englishWithSystems.representativeSystems.map(({ summary }) => summary),
    ['English summary two.', 'English summary one.'],
  );
  assert.deepEqual(
    frenchWithSystems.representativeSystems.map(({ title }) => title),
    ['Preuve Profil Un'],
    'A representative System without a published French localization must not leak into French Profile.',
  );
  assert.equal(
    frenchWithSystems.representativeSystems[0]?.slug,
    'preuve-profil-un',
  );

  await db
    .deleteFrom('profile_systems')
    .where('profile_id', '=', profileId)
    .execute();
  await db.deleteFrom('systems').where('id', 'in', [firstSystemId, secondSystemId]).execute();


  const selectedExperienceId = randomUUID();
  const unrelatedExperienceId = randomUUID();

  await db
    .insertInto('experiences')
    .values([
      { id: selectedExperienceId },
      { id: unrelatedExperienceId },
    ])
    .execute();

  await db
    .insertInto('experience_localizations')
    .values([
      {
        experience_id: selectedExperienceId,
        locale: 'en',
        title: 'Selected industrial experience',
        summary: 'Relevant English industrial context.',
      },
      {
        experience_id: selectedExperienceId,
        locale: 'fr',
        title: 'Expérience industrielle sélectionnée',
        summary: 'Contexte industriel français pertinent.',
      },
      {
        experience_id: unrelatedExperienceId,
        locale: 'en',
        title: 'Unrelated older work',
        summary: 'This must never appear automatically.',
      },
    ])
    .execute();

  const beforeJourneySelection = await getPublicProfile(db, 'en');
  assert.ok(beforeJourneySelection);
  assert.deepEqual(
    beforeJourneySelection.professionalJourney,
    [],
    'Existing Experience objects must never enter Profile automatically.',
  );

  await db
    .insertInto('profile_experiences')
    .values({
      profile_id: profileId,
      experience_id: selectedExperienceId,
      position: 0,
    })
    .execute();

  const englishWithJourney = await getPublicProfile(db, 'en');
  const frenchWithJourney = await getPublicProfile(db, 'fr');
  assert.ok(englishWithJourney);
  assert.ok(frenchWithJourney);
  assert.deepEqual(
    englishWithJourney.professionalJourney.map(({ title }) => title),
    ['Selected industrial experience'],
  );
  assert.deepEqual(
    frenchWithJourney.professionalJourney.map(({ title }) => title),
    ['Expérience industrielle sélectionnée'],
  );
  assert.equal(
    englishWithJourney.professionalJourney.some(
      ({ title }) => title === 'Unrelated older work',
    ),
    false,
    'Unselected older work must remain private even when it exists in the Experience domain.',
  );

  await db
    .deleteFrom('profile_experiences')
    .where('profile_id', '=', profileId)
    .execute();
  await db
    .deleteFrom('experiences')
    .where('id', 'in', [selectedExperienceId, unrelatedExperienceId])
    .execute();

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
    'Public Profile verification passed: singleton identity, editable shared/localized identity, localized portrait metadata, ordered bilingual working principles, representative published System references, intentional professional-journey selection, public reads, and database constraints are enforced.\n',
  );
} finally {
  await db.destroy();
}
