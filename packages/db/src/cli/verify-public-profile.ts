import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { emptyProfileContent } from '@akiksystems/core';

import { createDatabase } from '../database.js';
import {
  getPublicProfile,
  markProfileDraft,
  parseProfilePublicationSnapshot,
  publishProfileLocalization,
  unpublishProfileLocalization,
} from '../profile-publication.js';
import {
  markSystemDraft,
  publishSystemLocalization,
  unpublishSystemLocalization,
} from '../system-publication.js';
import { publishWritingLocalization } from '../writing-publication.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());

const technologyId = randomUUID();
const firstSystemId = randomUUID();
const secondSystemId = randomUUID();
const writingId = randomUUID();
const portraitId = randomUUID();
const cvId = randomUUID();
const stackGroupId = randomUUID();

const presentationDocument = {
  version: 1 as const,
  blocks: [{ type: 'paragraph' as const, text: 'Qualification proof.' }],
};

function profileContent(
  professionalTitle: string,
  introduction: string,
) {
  const content = emptyProfileContent();
  content.hero.professionalTitle = professionalTitle;
  content.hero.introduction = introduction;
  content.hero.cvLabel = 'Download CV';
  content.currentProject.role = 'Builder';
  content.currentProject.ctaLabel = 'Inspect system';
  content.stack.title = 'Stack';
  content.stack.proofCountLabel = 'Proved in';
  content.systemicScale.reasoningLinkLabel = 'Read the full reasoning';
  return content;
}

async function localizationStates(profileId: string) {
  return db
    .selectFrom('profile_localizations')
    .select(['locale', 'editorial_state', 'published_at'])
    .where('profile_id', '=', profileId)
    .orderBy('locale')
    .execute();
}

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);
  if (migrationResult.error !== undefined) throw migrationResult.error;

  const profiles = await db.selectFrom('profiles').selectAll().execute();
  assert.equal(profiles.length, 1, 'Exactly one public Profile must exist.');
  const profileId = profiles[0]?.id;
  assert.ok(profileId);
  assert.equal(profiles[0]?.singleton_key, 'public');

  const localizations = await db
    .selectFrom('profile_localizations')
    .select(['locale', 'content', 'editorial_state', 'published_at'])
    .where('profile_id', '=', profileId)
    .orderBy('locale')
    .execute();

  assert.deepEqual(
    localizations.map(({ locale }) => locale),
    ['en', 'fr'],
    'The singleton must own exactly one EN and one FR localization.',
  );
  assert.ok(localizations.every(({ editorial_state }) => editorial_state === 'draft'));
  assert.ok(localizations.every(({ published_at }) => published_at === null));

  assert.equal(await getPublicProfile(db, 'en'), null);
  assert.equal(await getPublicProfile(db, 'fr'), null);

  await assert.rejects(
    () => publishProfileLocalization(db, { locale: 'en' }),
    /display name is required/i,
  );

  await db
    .updateTable('profiles')
    .set({ display_name: 'Qualification Profile', updated_at: new Date() })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await assert.rejects(
    () => publishProfileLocalization(db, { locale: 'en' }),
    /professional title is required/i,
  );

  const englishContent = profileContent(
    'Systems builder',
    'Published English introduction.',
  );
  const frenchContent = profileContent(
    'Constructeur de systèmes',
    'Introduction française publiée.',
  );
  frenchContent.hero.cvLabel = 'Télécharger le CV';

  await db
    .updateTable('profile_localizations')
    .set({ content: englishContent, updated_at: new Date() })
    .where('profile_id', '=', profileId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();
  await db
    .updateTable('profile_localizations')
    .set({ content: frenchContent, updated_at: new Date() })
    .where('profile_id', '=', profileId)
    .where('locale', '=', 'fr')
    .executeTakeFirstOrThrow();

  const firstEnglishSnapshot = await publishProfileLocalization(db, {
    locale: 'en',
  });
  assert.equal(firstEnglishSnapshot.version, 1);
  assert.equal(firstEnglishSnapshot.content.hero.professionalTitle, 'Systems builder');
  assert.ok(await getPublicProfile(db, 'en'));
  assert.equal(await getPublicProfile(db, 'fr'), null);

  const changedEnglishContent = profileContent(
    'Systems builder',
    'Unpublished draft introduction.',
  );
  await db
    .updateTable('profile_localizations')
    .set({ content: changedEnglishContent, updated_at: new Date() })
    .where('profile_id', '=', profileId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();
  await markProfileDraft(db, { profileId, locale: 'en' });

  const publicBeforeRepublish = await getPublicProfile(db, 'en');
  assert.ok(publicBeforeRepublish);
  assert.equal(
    publicBeforeRepublish.content.hero.introduction,
    'Published English introduction.',
    'Draft Profile copy must not leak into the existing public snapshot.',
  );

  await publishProfileLocalization(db, { locale: 'en' });
  const publicAfterRepublish = await getPublicProfile(db, 'en');
  assert.ok(publicAfterRepublish);
  assert.equal(
    publicAfterRepublish.content.hero.introduction,
    'Unpublished draft introduction.',
  );

  await db
    .insertInto('assets')
    .values([
      {
        id: portraitId,
        storage_key: `qualification/profile/${portraitId}.webp`,
        original_filename: 'profile.webp',
        mime_type: 'image/webp',
        byte_size: 512,
        width: 800,
        height: 800,
      },
      {
        id: cvId,
        storage_key: `qualification/profile/${cvId}.pdf`,
        original_filename: 'profile.pdf',
        mime_type: 'application/pdf',
        byte_size: 2048,
      },
    ])
    .execute();

  await db
    .insertInto('asset_localizations')
    .values([
      {
        asset_id: portraitId,
        locale: 'en',
        alt_text: 'Published portrait alt',
        caption: null,
      },
      {
        asset_id: portraitId,
        locale: 'fr',
        alt_text: 'Portrait publié',
        caption: null,
      },
    ])
    .execute();

  await db
    .updateTable('profiles')
    .set({
      portrait_asset_id: portraitId,
      source_cv_asset_id: cvId,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await db
    .insertInto('profile_contacts')
    .values([
      {
        profile_id: profileId,
        kind: 'email',
        value: 'profile@example.test',
        visible: true,
      },
      {
        profile_id: profileId,
        kind: 'phone',
        value: '+33000000000',
        visible: false,
      },
    ])
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
      relocation: false,
      updated_at: new Date(),
    })
    .where('profile_id', '=', profileId)
    .executeTakeFirstOrThrow();

  await markProfileDraft(db, { profileId });
  const states = await localizationStates(profileId);
  assert.ok(
    states.every(
      ({ editorial_state, published_at }) =>
        editorial_state === 'draft' && published_at === null,
    ),
    'A global Profile mutation must mark both locales draft.',
  );
  assert.ok(
    await getPublicProfile(db, 'en'),
    'Marking a localization draft must not delete its previous public snapshot.',
  );

  await publishProfileLocalization(db, { locale: 'en' });
  await publishProfileLocalization(db, { locale: 'fr' });

  const publicWithIdentity = await getPublicProfile(db, 'en');
  assert.ok(publicWithIdentity);
  assert.equal(publicWithIdentity.portraitAssetId, portraitId);
  assert.equal(publicWithIdentity.portraitAltText, 'Published portrait alt');
  assert.equal(publicWithIdentity.sourceCvAssetId, cvId);
  assert.deepEqual(publicWithIdentity.contacts, [
    { kind: 'email', value: 'profile@example.test' },
  ]);
  assert.deepEqual(publicWithIdentity.languages, ['fr', 'en', 'ar']);
  assert.deepEqual(publicWithIdentity.mobility, {
    worldwide: true,
    remote: true,
    relocation: false,
  });

  await db
    .updateTable('asset_localizations')
    .set({ alt_text: 'Draft portrait alt', updated_at: new Date() })
    .where('asset_id', '=', portraitId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  const publicAfterAssetDraft = await getPublicProfile(db, 'en');
  assert.ok(publicAfterAssetDraft);
  assert.equal(
    publicAfterAssetDraft.portraitAltText,
    'Published portrait alt',
    'Profile-owned asset presentation data must remain frozen in the Profile snapshot.',
  );

  await db
    .insertInto('technologies')
    .values({
      id: technologyId,
      slug: 'qualification-react',
      name: 'React',
    })
    .execute();

  await db
    .insertInto('systems')
    .values([
      { id: firstSystemId, lifecycle: 'active', editorial_position: 10 },
      { id: secondSystemId, lifecycle: 'active', editorial_position: 20 },
    ])
    .execute();

  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: firstSystemId,
        locale: 'en',
        slug: 'qualification-system-one',
        title: 'Qualification System One',
        summary: 'First English proof System.',
        proof_role: 'Qualification',
        proof_maturity: 'Inspectable',
        proof_demo_nature: 'Synthetic',
        proof_data_nature: 'Synthetic',
        proof_limits: 'Qualification only.',
        presentation_document: presentationDocument,
      },
      {
        system_id: firstSystemId,
        locale: 'fr',
        slug: 'systeme-qualification-un',
        title: 'Système Qualification Un',
        summary: 'Premier système de preuve français.',
        proof_role: 'Qualification',
        proof_maturity: 'Inspectable',
        proof_demo_nature: 'Synthétique',
        proof_data_nature: 'Synthétique',
        proof_limits: 'Qualification uniquement.',
        presentation_document: presentationDocument,
      },
      {
        system_id: secondSystemId,
        locale: 'en',
        slug: 'qualification-system-two',
        title: 'Qualification System Two',
        summary: 'Second English proof System.',
        proof_role: 'Qualification',
        proof_maturity: 'Inspectable',
        proof_demo_nature: 'Synthetic',
        proof_data_nature: 'Synthetic',
        proof_limits: 'Qualification only.',
        presentation_document: presentationDocument,
      },
      {
        system_id: secondSystemId,
        locale: 'fr',
        slug: 'systeme-qualification-deux',
        title: 'Système Qualification Deux',
        summary: 'Second système de preuve français.',
        proof_role: 'Qualification',
        proof_maturity: 'Inspectable',
        proof_demo_nature: 'Synthétique',
        proof_data_nature: 'Synthétique',
        proof_limits: 'Qualification uniquement.',
        presentation_document: presentationDocument,
      },
    ])
    .execute();

  await db
    .insertInto('system_technologies')
    .values([
      { system_id: firstSystemId, technology_id: technologyId, position: 0 },
      { system_id: secondSystemId, technology_id: technologyId, position: 0 },
    ])
    .execute();

  await db
    .insertInto('system_technology_localizations')
    .values([
      {
        system_id: firstSystemId,
        technology_id: technologyId,
        locale: 'en',
        evidence: 'Published React evidence one.',
      },
      {
        system_id: firstSystemId,
        technology_id: technologyId,
        locale: 'fr',
        evidence: 'Preuve React publiée une.',
      },
      {
        system_id: secondSystemId,
        technology_id: technologyId,
        locale: 'en',
        evidence: 'Published React evidence two.',
      },
      {
        system_id: secondSystemId,
        technology_id: technologyId,
        locale: 'fr',
        evidence: 'Preuve React publiée deux.',
      },
    ])
    .execute();

  await publishSystemLocalization(db, { systemId: firstSystemId, locale: 'en' });
  await publishSystemLocalization(db, { systemId: firstSystemId, locale: 'fr' });
  await publishSystemLocalization(db, { systemId: secondSystemId, locale: 'en' });

  await db
    .insertInto('profile_stack_groups')
    .values({ id: stackGroupId, profile_id: profileId, position: 0 })
    .execute();

  await db
    .insertInto('profile_stack_group_localizations')
    .values([
      { group_id: stackGroupId, locale: 'en', title: 'Front-end' },
      { group_id: stackGroupId, locale: 'fr', title: 'Front-end' },
    ])
    .execute();

  await db
    .insertInto('profile_stack_group_technologies')
    .values({
      group_id: stackGroupId,
      technology_id: technologyId,
      position: 0,
    })
    .execute();

  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'article',
      lifecycle: 'active',
      editorial_position: 90,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values([
      {
        writing_id: writingId,
        locale: 'en',
        slug: 'qualification-systemic-scale',
        title: 'Qualification systemic scale',
        summary: 'Qualification reasoning.',
        body: 'Qualification reasoning body.',
      },
      {
        writing_id: writingId,
        locale: 'fr',
        slug: 'qualification-echelle-systemique',
        title: 'Qualification échelle systémique',
        summary: 'Raisonnement de qualification.',
        body: 'Corps du raisonnement de qualification.',
      },
    ])
    .execute();

  await publishWritingLocalization(db, { writingId, locale: 'en' });

  await db
    .updateTable('profiles')
    .set({
      current_system_id: secondSystemId,
      systemic_scale_writing_id: writingId,
      updated_at: new Date(),
    })
    .where('id', '=', profileId)
    .executeTakeFirstOrThrow();

  await markProfileDraft(db, { profileId });
  await publishProfileLocalization(db, { locale: 'en' });
  await publishProfileLocalization(db, { locale: 'fr' });

  const englishProofs = await getPublicProfile(db, 'en');
  const frenchBeforeExternalPublications = await getPublicProfile(db, 'fr');
  assert.ok(englishProofs);
  assert.ok(frenchBeforeExternalPublications);
  assert.equal(englishProofs.currentProject?.id, secondSystemId);
  assert.equal(englishProofs.stackGroups[0]?.proofCount, 2);
  assert.equal(englishProofs.systemicScaleWriting?.id, writingId);
  assert.equal(
    frenchBeforeExternalPublications.currentProject,
    null,
    'A selected System without a publication in the active locale must stay hidden.',
  );
  assert.equal(frenchBeforeExternalPublications.stackGroups[0]?.proofCount, 1);
  assert.equal(
    frenchBeforeExternalPublications.systemicScaleWriting,
    null,
    'A selected Writing without a publication in the active locale must stay hidden.',
  );

  await publishSystemLocalization(db, { systemId: secondSystemId, locale: 'fr' });
  await publishWritingLocalization(db, { writingId, locale: 'fr' });

  const frenchAfterExternalPublications = await getPublicProfile(db, 'fr');
  assert.ok(frenchAfterExternalPublications);
  assert.equal(
    frenchAfterExternalPublications.currentProject?.id,
    secondSystemId,
    'Publishing the selected System must make it appear without republishing Profile.',
  );
  assert.equal(frenchAfterExternalPublications.stackGroups[0]?.proofCount, 2);
  assert.equal(
    frenchAfterExternalPublications.systemicScaleWriting?.id,
    writingId,
    'Publishing the selected Writing must make it appear without republishing Profile.',
  );

  await db
    .updateTable('system_technology_localizations')
    .set({
      evidence: 'Unpublished React evidence one.',
      updated_at: new Date(),
    })
    .where('system_id', '=', firstSystemId)
    .where('technology_id', '=', technologyId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();
  await markSystemDraft(db, { systemId: firstSystemId, locale: 'en' });

  const beforeSystemRepublish = await getPublicProfile(db, 'en');
  assert.ok(beforeSystemRepublish);
  const beforeEvidence =
    beforeSystemRepublish.stackGroups[0]?.proofSystems
      .find(({ id }) => id === firstSystemId)
      ?.technologies[0]?.evidence;
  assert.equal(
    beforeEvidence,
    'Published React evidence one.',
    'System draft evidence must never leak through Profile.',
  );

  await publishSystemLocalization(db, { systemId: firstSystemId, locale: 'en' });
  const afterSystemRepublish = await getPublicProfile(db, 'en');
  assert.ok(afterSystemRepublish);
  const afterEvidence =
    afterSystemRepublish.stackGroups[0]?.proofSystems
      .find(({ id }) => id === firstSystemId)
      ?.technologies[0]?.evidence;
  assert.equal(afterEvidence, 'Unpublished React evidence one.');

  await unpublishSystemLocalization(db, {
    systemId: firstSystemId,
    locale: 'en',
  });
  const afterSystemUnpublish = await getPublicProfile(db, 'en');
  assert.ok(afterSystemUnpublish);
  assert.equal(
    afterSystemUnpublish.stackGroups[0]?.proofCount,
    1,
    'A System removed from the canonical public source must disappear from Profile proof resolution.',
  );

  await publishSystemLocalization(db, { systemId: firstSystemId, locale: 'en' });
  const afterSystemReturn = await getPublicProfile(db, 'en');
  assert.ok(afterSystemReturn);
  assert.equal(afterSystemReturn.stackGroups[0]?.proofCount, 2);

  assert.equal(
    parseProfilePublicationSnapshot({ version: 99 }),
    null,
    'Unknown Profile snapshot versions must be rejected.',
  );
  assert.equal(
    parseProfilePublicationSnapshot({
      ...firstEnglishSnapshot,
      stackGroups: [{ id: stackGroupId, position: 0, title: 'Broken' }],
    }),
    null,
    'Malformed Profile snapshots must be rejected instead of loosely accepted.',
  );

  await unpublishProfileLocalization(db, { locale: 'en' });
  assert.equal(await getPublicProfile(db, 'en'), null);
  assert.ok(
    await getPublicProfile(db, 'fr'),
    'Unpublishing EN must not remove the independent FR publication.',
  );

  console.log(
    'Public Profile verification passed: final schema, strict snapshots, locale isolation, live canonical references, Stack evidence and draft/public boundaries are enforced.',
  );
} finally {
  const profile = await db
    .selectFrom('profiles')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  if (profile !== undefined) {
    await db
      .deleteFrom('profile_publications')
      .where('profile_id', '=', profile.id)
      .execute();
    await db
      .deleteFrom('profile_stack_groups')
      .where('profile_id', '=', profile.id)
      .execute();
    await db
      .deleteFrom('profile_contacts')
      .where('profile_id', '=', profile.id)
      .execute();
    await db
      .deleteFrom('profile_languages')
      .where('profile_id', '=', profile.id)
      .execute();
    await db
      .updateTable('profile_mobility')
      .set({
        worldwide: false,
        remote: false,
        relocation: false,
        updated_at: new Date(),
      })
      .where('profile_id', '=', profile.id)
      .execute();
    await db
      .updateTable('profiles')
      .set({
        display_name: null,
        portrait_asset_id: null,
        source_cv_asset_id: null,
        current_system_id: null,
        systemic_scale_writing_id: null,
        updated_at: new Date(),
      })
      .where('id', '=', profile.id)
      .execute();
    await db
      .updateTable('profile_localizations')
      .set({
        content: {},
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('profile_id', '=', profile.id)
      .execute();
  }

  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db
    .deleteFrom('systems')
    .where('id', 'in', [firstSystemId, secondSystemId])
    .execute();
  await db.deleteFrom('technologies').where('id', '=', technologyId).execute();
  await db.deleteFrom('assets').where('id', 'in', [portraitId, cvId]).execute();
  await db.destroy();
}
