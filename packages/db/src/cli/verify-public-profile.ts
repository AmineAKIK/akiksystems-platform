import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { getDraftProfile, getPublicProfile } from '../public-profile.js';
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

  const english = await getDraftProfile(db, 'en');
  const french = await getDraftProfile(db, 'fr');
  assert.ok(english);
  assert.ok(french);
  assert.equal(english.id, french.id, 'EN/FR must share one Profile identity.');
  assert.equal(english.alternateLocale, 'fr');
  assert.equal(french.alternateLocale, 'en');

  assert.equal(
    await getPublicProfile(db, 'en'),
    null,
    'Draft Profile data must not become public before an explicit publication snapshot exists.',
  );

  await db
    .insertInto('profile_publications')
    .values({
      profile_id: english.id,
      locale: 'en',
      snapshot: english as unknown as Record<string, unknown>,
      published_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  const publishedBootstrap = await getPublicProfile(db, 'en');
  assert.ok(publishedBootstrap);
  assert.deepEqual(
    publishedBootstrap,
    english,
    'Public Profile reads must come from the stored publication snapshot.',
  );

  await db
    .updateTable('profile_localizations')
    .set({
      introduction: 'Draft changed after publication.',
      updated_at: new Date(),
    })
    .where('profile_id', '=', english.id)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  const publishedAfterDraftMutation = await getPublicProfile(db, 'en');
  assert.deepEqual(
    publishedAfterDraftMutation,
    english,
    'Editing the normalized draft must not mutate the published Profile snapshot.',
  );

  await db
    .updateTable('profile_localizations')
    .set({
      introduction: english.introduction,
      updated_at: new Date(),
    })
    .where('profile_id', '=', english.id)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

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

  const administeredEnglish = await getDraftProfile(db, 'en');
  const administeredFrench = await getDraftProfile(db, 'fr');
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

  const englishWithPrinciples = await getDraftProfile(db, 'en');
  const frenchWithPrinciples = await getDraftProfile(db, 'fr');
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


  const architectureGroupId = randomUUID();
  const deliveryGroupId = randomUUID();
  const architectureCapabilityId = randomUUID();
  const deliveryCapabilityId = randomUUID();

  await db
    .insertInto('profile_capability_groups')
    .values([
      {
        id: architectureGroupId,
        profile_id: profileId,
        position: 0,
      },
      {
        id: deliveryGroupId,
        profile_id: profileId,
        position: 1,
      },
    ])
    .execute();

  await db
    .insertInto('profile_capability_group_localizations')
    .values([
      {
        group_id: architectureGroupId,
        locale: 'en',
        title: 'Architecture',
      },
      {
        group_id: architectureGroupId,
        locale: 'fr',
        title: 'Architecture',
      },
      {
        group_id: deliveryGroupId,
        locale: 'en',
        title: 'Delivery',
      },
      {
        group_id: deliveryGroupId,
        locale: 'fr',
        title: 'Livraison',
      },
    ])
    .execute();

  await db
    .insertInto('profile_capabilities')
    .values([
      {
        id: architectureCapabilityId,
        group_id: architectureGroupId,
        position: 0,
      },
      {
        id: deliveryCapabilityId,
        group_id: deliveryGroupId,
        position: 0,
      },
    ])
    .execute();

  await db
    .insertInto('profile_capability_localizations')
    .values([
      {
        capability_id: architectureCapabilityId,
        locale: 'en',
        title: 'Design bounded systems',
        summary: 'Shape explicit boundaries and contracts.',
      },
      {
        capability_id: architectureCapabilityId,
        locale: 'fr',
        title: 'Concevoir des systèmes délimités',
        summary: 'Structurer des frontières et des contrats explicites.',
      },
      {
        capability_id: deliveryCapabilityId,
        locale: 'en',
        title: 'Qualify delivery paths',
        summary: null,
      },
      {
        capability_id: deliveryCapabilityId,
        locale: 'fr',
        title: 'Qualifier les parcours de livraison',
        summary: null,
      },
    ])
    .execute();

  const englishWithCapabilities = await getDraftProfile(db, 'en');
  const frenchWithCapabilities = await getDraftProfile(db, 'fr');
  assert.ok(englishWithCapabilities);
  assert.ok(frenchWithCapabilities);
  assert.deepEqual(
    englishWithCapabilities.capabilityGroups.map(({ title }) => title),
    ['Architecture', 'Delivery'],
  );
  assert.deepEqual(
    frenchWithCapabilities.capabilityGroups.map(({ title }) => title),
    ['Architecture', 'Livraison'],
  );
  assert.deepEqual(
    englishWithCapabilities.capabilityGroups[0]?.capabilities.map(
      ({ title }) => title,
    ),
    ['Design bounded systems'],
  );
  assert.equal(
    frenchWithCapabilities.capabilityGroups[1]?.capabilities[0]?.title,
    'Qualifier les parcours de livraison',
  );

  const technologyId = randomUUID();
  await db
    .insertInto('technologies')
    .values({
      id: technologyId,
      slug: `qualification-react-${technologyId}`,
      name: 'React',
    })
    .execute();

  const afterTechnologyInsert = await getDraftProfile(db, 'en');
  assert.ok(afterTechnologyInsert);
  assert.deepEqual(
    afterTechnologyInsert.capabilityGroups,
    englishWithCapabilities.capabilityGroups,
    'Adding a Technology must not alter Profile capabilities.',
  );

  await db
    .deleteFrom('profile_capability_groups')
    .where('profile_id', '=', profileId)
    .execute();
  await db.deleteFrom('technologies').where('id', '=', technologyId).execute();


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

  const englishWithSystems = await getDraftProfile(db, 'en');
  const frenchWithSystems = await getDraftProfile(db, 'fr');
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
    .updateTable('profile_technology_journey_stages')
    .set({
      evidence_system_id: secondSystemId,
      evidence_experience_id: null,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .where('stage_key', '=', 'development_akiksystems')
    .executeTakeFirstOrThrow();

  const englishWithTechnologyJourney = await getDraftProfile(db, 'en');
  const frenchWithTechnologyJourney = await getDraftProfile(db, 'fr');
  assert.ok(englishWithTechnologyJourney);
  assert.ok(frenchWithTechnologyJourney);
  assert.deepEqual(
    englishWithTechnologyJourney.technologyJourney.map(({ key }) => key),
    [
      'programming',
      'networks_telecom',
      'it_support',
      'industry',
      'development_akiksystems',
    ],
    'The technological journey must preserve the fixed five-step technical progression.',
  );
  assert.equal(
    englishWithTechnologyJourney.technologyJourney[4]?.evidence?.title,
    'Profile Proof Two',
  );
  assert.equal(
    englishWithTechnologyJourney.technologyJourney[4]?.evidence?.href,
    '/en/systems/profile-proof-two',
  );
  assert.equal(
    frenchWithTechnologyJourney.technologyJourney[4]?.evidence,
    null,
    'Unpublished localized System evidence must disappear from the technological journey.',
  );

  await db
    .updateTable('profile_technology_journey_stages')
    .set({
      evidence_system_id: null,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .where('stage_key', '=', 'development_akiksystems')
    .executeTakeFirstOrThrow();

  const evidencePrincipleId = randomUUID();

  await db
    .insertInto('profile_work_principles')
    .values({
      id: evidencePrincipleId,
      profile_id: profileId,
      position: 0,
      evidence_system_id: secondSystemId,
    })
    .execute();

  await db
    .insertInto('profile_work_principle_localizations')
    .values([
      {
        principle_id: evidencePrincipleId,
        locale: 'en',
        title: 'Connect claims to proof',
        detail: 'Use a concrete example when it adds useful evidence.',
      },
      {
        principle_id: evidencePrincipleId,
        locale: 'fr',
        title: 'Relier les affirmations aux preuves',
        detail: 'Utiliser un exemple concret quand il apporte une preuve utile.',
      },
    ])
    .execute();

  const englishWithPrincipleEvidence = await getDraftProfile(db, 'en');
  const frenchWithPrincipleEvidence = await getDraftProfile(db, 'fr');
  assert.ok(englishWithPrincipleEvidence);
  assert.ok(frenchWithPrincipleEvidence);
  assert.deepEqual(
    englishWithPrincipleEvidence.workPrinciples[0]?.evidenceSystem,
    {
      id: secondSystemId,
      slug: 'profile-proof-two',
      title: 'Profile Proof Two',
    },
  );
  assert.equal(
    frenchWithPrincipleEvidence.workPrinciples[0]?.evidenceSystem,
    null,
    'A principle must not expose a System example when that locale is not published.',
  );

  let longPrincipleError: unknown;
  try {
    await db
      .insertInto('profile_work_principle_localizations')
      .values({
        principle_id: evidencePrincipleId,
        locale: 'en',
        title: 'x'.repeat(81),
        detail: null,
      })
      .onConflict((conflict) =>
        conflict.columns(['principle_id', 'locale']).doUpdateSet({
          title: 'x'.repeat(81),
        }),
      )
      .execute();
  } catch (error) {
    longPrincipleError = error;
  }
  assert.ok(longPrincipleError && typeof longPrincipleError === 'object');
  assert.equal((longPrincipleError as PostgreSqlError).code, '23514');
  assert.equal(
    (longPrincipleError as PostgreSqlError).constraint,
    'profile_work_principle_localizations_title_length_check',
  );

  await db
    .deleteFrom('profile_work_principles')
    .where('id', '=', evidencePrincipleId)
    .execute();

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

  const beforeJourneySelection = await getDraftProfile(db, 'en');
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

  const englishWithJourney = await getDraftProfile(db, 'en');
  const frenchWithJourney = await getDraftProfile(db, 'fr');
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
    .insertInto('profile_languages')
    .values([
      { profile_id: profileId, language_code: 'fr', position: 0 },
      { profile_id: profileId, language_code: 'en', position: 1 },
      { profile_id: profileId, language_code: 'ar', position: 2 },
    ])
    .execute();

  await db
    .updateTable('profile_mobility')
    .set({
      worldwide: true,
      remote: true,
      relocation: true,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .executeTakeFirstOrThrow();

  const englishWithLanguages = await getDraftProfile(db, 'en');
  const frenchWithLanguages = await getDraftProfile(db, 'fr');
  assert.ok(englishWithLanguages);
  assert.ok(frenchWithLanguages);
  assert.deepEqual(englishWithLanguages.languages, ['fr', 'en', 'ar']);
  assert.deepEqual(frenchWithLanguages.languages, ['fr', 'en', 'ar']);
  assert.deepEqual(englishWithLanguages.mobility, {
    worldwide: true,
    remote: true,
    relocation: true,
  });
  assert.deepEqual(frenchWithLanguages.mobility, {
    worldwide: true,
    remote: true,
    relocation: true,
  });

  let languageCodeError: unknown;
  try {
    await sql`
      insert into profile_languages (profile_id, language_code, position)
      values (${profileId}::uuid, 'de', 3)
    `.execute(db);
  } catch (error) {
    languageCodeError = error;
  }
  assert.ok(languageCodeError && typeof languageCodeError === 'object');
  assert.equal((languageCodeError as PostgreSqlError).code, '23514');
  assert.equal(
    (languageCodeError as PostgreSqlError).constraint,
    'profile_languages_language_code_check',
  );

  await db
    .deleteFrom('profile_languages')
    .where('profile_id', '=', profileId)
    .execute();

  const sourceCvId = randomUUID();

  await db
    .insertInto('assets')
    .values({
      id: sourceCvId,
      storage_key: `qualification/profile/${sourceCvId}.pdf`,
      original_filename: 'amine-akik-cv.pdf',
      mime_type: 'application/pdf',
      byte_size: 2048,
    })
    .execute();

  await db
    .updateTable('profiles')
    .set({
      source_cv_asset_id: sourceCvId,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  const englishWithCv = await getDraftProfile(db, 'en');
  const frenchWithCv = await getDraftProfile(db, 'fr');
  assert.ok(englishWithCv);
  assert.ok(frenchWithCv);
  assert.equal(englishWithCv.sourceCvAssetId, sourceCvId);
  assert.equal(
    frenchWithCv.sourceCvAssetId,
    sourceCvId,
    'The source CV is one shared artifact, not duplicated by locale.',
  );

  let reusedPortraitError: unknown;
  try {
    await db
      .updateTable('profiles')
      .set({
        portrait_asset_id: sourceCvId,
        updated_at: new Date(),
      })
      .where('id', '=', profileId)
      .executeTakeFirstOrThrow();
  } catch (error) {
    reusedPortraitError = error;
  }
  assert.ok(reusedPortraitError && typeof reusedPortraitError === 'object');
  assert.equal((reusedPortraitError as PostgreSqlError).code, '23514');
  assert.equal(
    (reusedPortraitError as PostgreSqlError).constraint,
    'profiles_source_cv_distinct_from_portrait_check',
  );

  await db
    .updateTable('profiles')
    .set({
      source_cv_asset_id: null,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await db.deleteFrom('assets').where('id', '=', sourceCvId).execute();

  await db
    .updateTable('profile_mobility')
    .set({
      worldwide: false,
      remote: false,
      relocation: false,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .executeTakeFirstOrThrow();

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
  await db
    .deleteFrom('profile_publications')
    .where('profile_id', '=', profileId)
    .execute();

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
    'Public Profile verification passed: singleton identity, draft/public snapshot separation, editable shared/localized identity, localized portrait metadata, stable ordered bilingual working principles with optional published System evidence, representative published System references, intentional professional-journey selection, capability groups distinct from technologies, structured languages and mobility, optional shared source CV linkage, a fixed localized five-step technological journey with publication-aware evidence, and database constraints are enforced.\n',
  );
} finally {
  await db.destroy();
}
