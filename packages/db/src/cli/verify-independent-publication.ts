import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();

const enDocument = {
  version: 1 as const,
  blocks: [
    {
      type: 'paragraph' as const,
      text: 'Published English content.',
    },
  ],
};

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: systemId,
        locale: 'en',
        slug: 'sentinel-en',
        title: 'Sentinel',
        summary: 'English summary.',
        presentation_document: enDocument,
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: systemId,
        locale: 'fr',
        slug: 'sentinel-fr',
        title: 'Sentinel',
        summary: 'Résumé français initial.',
        presentation_document: {
          version: 1,
          blocks: [
            {
              type: 'paragraph',
              text: 'Contenu français en brouillon.',
            },
          ],
        },
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .execute();

  const englishBefore = await db
    .selectFrom('system_localizations')
    .select([
      'slug',
      'title',
      'summary',
      'presentation_document',
      'editorial_state',
      'published_at',
      'updated_at',
    ])
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(englishBefore.editorial_state, 'published');
  assert.ok(englishBefore.published_at instanceof Date);

  await db
    .updateTable('system_localizations')
    .set({
      title: 'Sentinel FR révisé',
      summary: 'Résumé français modifié.',
      updated_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'fr')
    .execute();

  const englishAfterFrenchEdit = await db
    .selectFrom('system_localizations')
    .select([
      'slug',
      'title',
      'summary',
      'presentation_document',
      'editorial_state',
      'published_at',
      'updated_at',
    ])
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(englishAfterFrenchEdit.slug, englishBefore.slug);
  assert.equal(englishAfterFrenchEdit.title, englishBefore.title);
  assert.equal(englishAfterFrenchEdit.summary, englishBefore.summary);
  assert.deepEqual(
    englishAfterFrenchEdit.presentation_document,
    englishBefore.presentation_document,
  );
  assert.equal(
    englishAfterFrenchEdit.editorial_state,
    englishBefore.editorial_state,
  );
  assert.equal(
    englishAfterFrenchEdit.published_at?.getTime(),
    englishBefore.published_at?.getTime(),
  );
  assert.equal(
    englishAfterFrenchEdit.updated_at.getTime(),
    englishBefore.updated_at.getTime(),
  );

  await db
    .updateTable('system_localizations')
    .set({
      editorial_state: 'published',
      published_at: new Date(),
      updated_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'fr')
    .execute();

  const statesAfterFrenchPublish = await db
    .selectFrom('system_localizations')
    .select(['locale', 'editorial_state', 'published_at'])
    .where('system_id', '=', systemId)
    .orderBy('locale')
    .execute();

  assert.deepEqual(
    statesAfterFrenchPublish.map((row) => ({
      locale: row.locale,
      state: row.editorial_state,
      hasPublishedAt: row.published_at instanceof Date,
    })),
    [
      { locale: 'en', state: 'published', hasPublishedAt: true },
      { locale: 'fr', state: 'published', hasPublishedAt: true },
    ],
  );

  await db
    .updateTable('system_localizations')
    .set({
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'fr')
    .execute();

  const finalStates = await db
    .selectFrom('system_localizations')
    .select(['locale', 'editorial_state', 'published_at'])
    .where('system_id', '=', systemId)
    .orderBy('locale')
    .execute();

  assert.deepEqual(
    finalStates.map((row) => ({
      locale: row.locale,
      state: row.editorial_state,
      hasPublishedAt: row.published_at instanceof Date,
    })),
    [
      { locale: 'en', state: 'published', hasPublishedAt: true },
      { locale: 'fr', state: 'draft', hasPublishedAt: false },
    ],
  );

  process.stdout.write(
    'Independent publication verification passed: EN and FR publish independently, and FR draft edits do not alter published EN content.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.destroy();
}
