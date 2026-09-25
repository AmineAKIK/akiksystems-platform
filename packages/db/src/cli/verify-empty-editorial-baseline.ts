import { strict as assert } from 'node:assert';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

async function count(table: string): Promise<number> {
  const result = await sql<{ count: string }>`
    select count(*)::text as count
    from ${sql.raw(table)}
  `.execute(db);

  return Number(result.rows[0]?.count ?? '0');
}

try {
  for (const table of [
    'systems',
    'system_publications',
    'writings',
    'writing_publications',
    'trainings',
    'training_publications',
    'credentials',
    'credential_publications',
    'learning_artifacts',
    'learning_artifact_publications',
    'experiences',
    'technologies',
    'assets',
    'work_with_us_pages',
    'work_with_us_localizations',
    'work_with_us_publications',
    'profile_publications',
    'profile_work_principles',
    'profile_capability_groups',
    'profile_capabilities',
    'profile_languages',
    'profile_experiences',
    'profile_systems',
  ]) {
    assert.equal(await count(table), 0, `${table} must start empty.`);
  }

  const profile = await db
    .selectFrom('profiles')
    .select(['id', 'display_name', 'portrait_asset_id', 'source_cv_asset_id'])
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();

  assert.equal(profile.display_name, null);
  assert.equal(profile.portrait_asset_id, null);
  assert.equal(profile.source_cv_asset_id, null);

  const profileLocales = await db
    .selectFrom('profile_localizations')
    .select(['locale', 'professional_title', 'introduction', 'foundational_copy'])
    .where('profile_id', '=', profile.id)
    .orderBy('locale')
    .execute();

  assert.deepEqual(profileLocales.map(({ locale }) => locale), ['en', 'fr']);
  for (const locale of profileLocales) {
    assert.equal(locale.professional_title, null);
    assert.equal(locale.introduction, null);
    assert.equal(locale.foundational_copy, null);
  }

  const mobility = await db
    .selectFrom('profile_mobility')
    .select(['worldwide', 'remote', 'relocation'])
    .where('profile_id', '=', profile.id)
    .executeTakeFirstOrThrow();
  assert.deepEqual(mobility, {
    worldwide: false,
    remote: false,
    relocation: false,
  });

  const journeyStages = await db
    .selectFrom('profile_technology_journey_stages')
    .select(['stage_key', 'position', 'evidence_experience_id', 'evidence_system_id'])
    .where('profile_id', '=', profile.id)
    .orderBy('position')
    .execute();
  assert.deepEqual(
    journeyStages.map(({ stage_key }) => stage_key),
    [
      'programming',
      'networks_telecom',
      'it_support',
      'industry',
      'development_akiksystems',
    ],
  );
  for (const stage of journeyStages) {
    assert.equal(stage.evidence_experience_id, null);
    assert.equal(stage.evidence_system_id, null);
  }
  assert.equal(await count('profile_technology_journey_stage_localizations'), 0);

  const legalPages = await db
    .selectFrom('legal_pages')
    .select(['id', 'page_key'])
    .orderBy('page_key')
    .execute();
  assert.equal(legalPages.length, 3);

  const legalLocalizations = await db
    .selectFrom('legal_page_localizations')
    .select(['locale', 'title', 'editor_document', 'editorial_state', 'published_at'])
    .execute();
  assert.equal(legalLocalizations.length, 6);
  for (const locale of legalLocalizations) {
    assert.equal(locale.title, null);
    assert.equal(locale.editor_document, null);
    assert.equal(locale.editorial_state, 'draft');
    assert.equal(locale.published_at, null);
  }
  assert.equal(await count('legal_page_publications'), 0);

  process.stdout.write(
    'Empty editorial baseline verified: only structural singleton/legal rows remain; no authored or published content is provisioned.\n',
  );
} finally {
  await db.destroy();
}
