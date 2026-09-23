import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedWriting,
  listPublishedWritings,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writingId = randomUUID();

try {
  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'article',
      editorial_weight: 'normal',
      editorial_position: 91,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values([
      {
        writing_id: writingId,
        locale: 'en',
        slug: 'aks-108-lifecycle',
        title: 'AKS-108 lifecycle',
        summary: 'Draft, preview, publish, and archive qualification.',
        body: 'English lifecycle body.',
      },
      {
        writing_id: writingId,
        locale: 'fr',
        slug: 'aks-108-cycle',
        title: 'AKS-108 cycle éditorial',
        summary: 'Qualification du cycle brouillon, aperçu, publication et archive.',
        body: 'Corps français du cycle éditorial.',
      },
    ])
    .execute();

  await publishWritingLocalization(db, { writingId, locale: 'en' });
  await publishWritingLocalization(db, { writingId, locale: 'fr' });

  assert.ok(
    await getPublishedWriting(db, {
      locale: 'en',
      slug: 'aks-108-lifecycle',
    }),
  );
  assert.ok(
    await getPublishedWriting(db, {
      locale: 'fr',
      slug: 'aks-108-cycle',
    }),
  );

  const archivedAt = new Date();
  await db
    .updateTable('writings')
    .set({
      lifecycle: 'archived',
      archived_at: archivedAt,
      updated_at: archivedAt,
    })
    .where('id', '=', writingId)
    .execute();

  assert.equal(
    await getPublishedWriting(db, {
      locale: 'en',
      slug: 'aks-108-lifecycle',
    }),
    null,
    'Archived Writings must disappear from public deep-link resolution.',
  );
  assert.equal(
    (await listPublishedWritings(db, 'fr')).some(
      (writing) => writing.writingId === writingId,
    ),
    false,
    'Archived Writings must disappear from public lists.',
  );

  const preservedPublications = await db
    .selectFrom('writing_publications')
    .select(['locale', 'slug'])
    .where('writing_id', '=', writingId)
    .orderBy('locale')
    .execute();
  assert.deepEqual(
    preservedPublications.map((publication) => publication.locale),
    ['en', 'fr'],
    'Archiving must preserve immutable locale publication snapshots.',
  );

  const localizationStates = await db
    .selectFrom('writing_localizations')
    .select(['locale', 'editorial_state', 'published_at'])
    .where('writing_id', '=', writingId)
    .orderBy('locale')
    .execute();
  assert.deepEqual(
    localizationStates.map((localization) => localization.editorial_state),
    ['published', 'published'],
    'Entity archive state must remain separate from localized publication state.',
  );
  assert.ok(
    localizationStates.every(
      (localization) => localization.published_at instanceof Date,
    ),
  );

  await assert.rejects(
    publishWritingLocalization(db, { writingId, locale: 'en' }),
    /archived Writings cannot be published/i,
  );

  await assert.rejects(
    db
      .updateTable('writings')
      .set({
        lifecycle: 'active',
        archived_at: new Date(),
      })
      .where('id', '=', writingId)
      .execute(),
    'Active Writings cannot carry an archive timestamp.',
  );

  await assert.rejects(
    db
      .updateTable('writings')
      .set({
        lifecycle: 'archived',
        archived_at: null,
      })
      .where('id', '=', writingId)
      .execute(),
    'Archived Writings must carry an archive timestamp.',
  );

  await db
    .updateTable('writings')
    .set({
      lifecycle: 'active',
      archived_at: null,
      updated_at: new Date(),
    })
    .where('id', '=', writingId)
    .execute();

  assert.ok(
    await getPublishedWriting(db, {
      locale: 'en',
      slug: 'aks-108-lifecycle',
    }),
    'Restoring a Writing should make preserved locale snapshots visible again.',
  );

  process.stdout.write(
    'AKS-108 Writing lifecycle qualification passed: locale publication remains independent, archives hide public delivery without deleting snapshots, archived publication is blocked, and restore is reversible.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db.destroy();
}
