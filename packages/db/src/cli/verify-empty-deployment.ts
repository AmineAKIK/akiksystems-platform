import assert from 'node:assert/strict';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

const emptyTables = [
  'systems',
  'system_localizations',
  'system_publications',
  'system_links',
  'system_assets',
  'system_experiences',
  'system_technologies',
  'technologies',
  'experiences',
  'experience_localizations',
  'assets',
  'asset_localizations',
  'writings',
  'writing_localizations',
  'writing_publications',
  'writing_assets',
  'writing_categories',
  'writing_tags',
  'writing_systems',
  'categories',
  'category_localizations',
  'category_publications',
  'tags',
  'tag_localizations',
  'tag_publications',
  'trainings',
  'training_localizations',
  'training_publications',
  'credentials',
  'credential_localizations',
  'credential_publications',
  'learning_artifacts',
  'learning_artifact_localizations',
  'learning_artifact_publications',
  'profile_publications',
  'profile_work_principles',
  'profile_capability_groups',
  'profile_capabilities',
  'profile_languages',
  'profile_mobility',
  'profile_technology_journey_stages',
  'profile_technology_journey_stage_localizations',
  'profile_experiences',
  'profile_systems',
  'work_with_us_pages',
  'work_with_us_localizations',
  'work_with_us_publications',
  'system_metadata',
  'admin_audit_events',
] as const;

try {
  for (const table of emptyTables) {
    const result = await db
      .selectFrom(table)
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow();

    assert.equal(
      Number(result.count),
      0,
      `${table} must be empty after deployment migration.`,
    );
  }

  const profiles = await db
    .selectFrom('profiles')
    .select([
      'id',
      'singleton_key',
      'display_name',
      'portrait_asset_id',
      'source_cv_asset_id',
    ])
    .execute();

  assert.equal(profiles.length, 1, 'Exactly one structural Profile must remain.');
  assert.equal(profiles[0]?.singleton_key, 'public');
  assert.equal(profiles[0]?.display_name, null);
  assert.equal(profiles[0]?.portrait_asset_id, null);
  assert.equal(profiles[0]?.source_cv_asset_id, null);

  const localizations = await db
    .selectFrom('profile_localizations')
    .select([
      'locale',
      'professional_title',
      'introduction',
      'foundational_copy',
    ])
    .orderBy('locale')
    .execute();

  assert.deepEqual(
    localizations.map(({ locale }) => locale),
    ['en', 'fr'],
    'The empty Profile must retain only its EN/FR administration skeleton.',
  );
  assert.ok(
    localizations.every(
      (row) =>
        row.professional_title === null &&
        row.introduction === null &&
        row.foundational_copy === null,
    ),
    'Profile localization skeletons must contain no authored copy.',
  );

  process.stdout.write(
    'Empty deployment baseline verified: schema/admin skeleton remains, editorial content is empty.\n',
  );
} finally {
  await db.destroy();
}
