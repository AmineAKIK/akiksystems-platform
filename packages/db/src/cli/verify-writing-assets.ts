import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import { publishWritingLocalization } from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writingId = randomUUID();
const assetId = randomUUID();
const unlinkedAssetId = randomUUID();

const documentWith = (id: string) => ({
  version: 1,
  type: 'doc',
  content: [{ type: 'image', attrs: { assetId: id } }],
});

try {
  const positionRow = await db
    .selectFrom('writings')
    .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
    .executeTakeFirst();

  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'article',
      editorial_weight: 'normal',
      editorial_position: (positionRow?.max_position ?? -1) + 1,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values([
      {
        writing_id: writingId,
        locale: 'en',
        slug: 'aks-107-contextual-assets',
        title: 'AKS-107 Contextual Assets',
        summary: 'Qualification for contextual Writing media.',
        editor_document:
          documentWith(assetId) as unknown as Record<string, unknown>,
      },
      {
        writing_id: writingId,
        locale: 'fr',
        slug: 'aks-107-medias-contextuels',
        title: 'AKS-107 Médias contextuels',
        summary: 'Qualification des médias contextuels des Writings.',
        editor_document:
          documentWith(assetId) as unknown as Record<string, unknown>,
      },
    ])
    .execute();

  await db
    .insertInto('assets')
    .values({
      id: assetId,
      storage_key: `qualification/writings/${assetId}.webp`,
      original_filename: 'writing-context.webp',
      mime_type: 'image/webp',
      byte_size: 1024,
      width: 1200,
      height: 800,
    })
    .execute();

  await db
    .insertInto('asset_localizations')
    .values([
      {
        asset_id: assetId,
        locale: 'en',
        alt_text: 'Contextual Writing image',
        caption: 'English contextual caption',
      },
      {
        asset_id: assetId,
        locale: 'fr',
        alt_text: 'Image contextuelle du Writing',
        caption: 'Légende contextuelle française',
      },
    ])
    .execute();

  await db
    .insertInto('writing_assets')
    .values({ writing_id: writingId, asset_id: assetId })
    .execute();

  await assert.rejects(
    db.deleteFrom('assets').where('id', '=', assetId).execute(),
    'A contextual Writing relation must protect the asset from deletion.',
  );

  await publishWritingLocalization(db, { writingId, locale: 'en' });

  const englishPublication = await db
    .selectFrom('writing_publications')
    .select('snapshot')
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(englishPublication.snapshot.version, 5);
  assert.deepEqual(englishPublication.snapshot.assets, [
    {
      id: assetId,
      mimeType: 'image/webp',
      altText: 'Contextual Writing image',
      caption: 'English contextual caption',
      width: 1200,
      height: 800,
    },
  ]);

  await db
    .updateTable('asset_localizations')
    .set({
      alt_text: 'Changed draft alt text',
      updated_at: new Date(),
    })
    .where('asset_id', '=', assetId)
    .where('locale', '=', 'en')
    .execute();

  const unchangedPublication = await db
    .selectFrom('writing_publications')
    .select('snapshot')
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(
    (unchangedPublication.snapshot.assets as Array<{ altText: string }>)[0]
      ?.altText,
    'Contextual Writing image',
    'Published alt text must remain frozen until republishing.',
  );

  await db
    .updateTable('asset_localizations')
    .set({ alt_text: null, updated_at: new Date() })
    .where('asset_id', '=', assetId)
    .where('locale', '=', 'fr')
    .execute();

  await assert.rejects(
    publishWritingLocalization(db, { writingId, locale: 'fr' }),
    /alt text.*required/i,
    'A referenced image must have localized alt text before publication.',
  );

  await db
    .updateTable('asset_localizations')
    .set({
      alt_text: 'Image contextuelle du Writing',
      updated_at: new Date(),
    })
    .where('asset_id', '=', assetId)
    .where('locale', '=', 'fr')
    .execute();

  await db
    .updateTable('writing_localizations')
    .set({
      editor_document:
        documentWith(unlinkedAssetId) as unknown as Record<string, unknown>,
      updated_at: new Date(),
    })
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'fr')
    .execute();

  await assert.rejects(
    publishWritingLocalization(db, { writingId, locale: 'fr' }),
    /outside its Writing context/i,
    'Publication must reject document assets that are not linked to the Writing.',
  );

  process.stdout.write(
    'AKS-107 contextual Writing asset qualification passed: explicit relations, localized metadata, immutable snapshots, alt-text publication readiness, and protected deletion are enforced.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();
  await db.destroy();
}
