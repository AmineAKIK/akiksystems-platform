import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { getPublishedSystem } from '../public-system.js';
import {
  markSystemDraft,
  publishSystemLocalization,
  unpublishSystemLocalization,
} from '../system-publication.js';
import { databaseUrlFromEnv } from './env.js';

interface PostgreSqlError {
  code?: string;
  constraint?: string;
}

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();
const assetId = randomUUID();

try {
  await db
    .insertInto('systems')
    .values({
      id: systemId,
      evidence_policy: 'documented_only',
    })
    .execute();

  await db
    .insertInto('assets')
    .values({
      id: assetId,
      storage_key: `qualification/snapshot/${assetId}.webp`,
      original_filename: 'snapshot.webp',
      mime_type: 'image/webp',
      byte_size: 256,
      width: 1280,
      height: 720,
    })
    .execute();

  await db
    .insertInto('system_assets')
    .values({
      system_id: systemId,
      asset_id: assetId,
      position: 0,
    })
    .execute();

  await db.insertInto('system_localizations').values({
    system_id: systemId,
    locale: 'en',
    slug: 'snapshot-qualification',
    title: 'Published title',
    summary: 'Snapshot qualification summary.',
    proof_role: 'Qualification fixture',
    proof_maturity: 'Implemented test fixture',
    proof_demo_nature: 'No demo',
    proof_data_nature: 'Synthetic qualification data',
    proof_limits: 'Not product evidence.',
    presentation_document: {
      version: 1,
      blocks: [
        { type: 'paragraph', text: 'Published body.' },
        { type: 'image', assetId },
      ],
    },
  }).execute();

  await db.insertInto('system_links').values([
    {
      id: randomUUID(),
      system_id: systemId,
      kind: 'live',
      url: 'https://example.invalid/live',
      position: 0,
    },
    {
      id: randomUUID(),
      system_id: systemId,
      kind: 'documentation',
      url: 'https://example.invalid/docs',
      label_en: 'Qualification documentation',
      label_fr: 'Documentation de qualification',
      position: 1,
    },
  ]).execute();

  await publishSystemLocalization(db, { systemId, locale: 'en' });

  const published = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(published);
  assert.equal(published.title, 'Published title');
  assert.deepEqual(
    published.links.map(({ kind }) => kind),
    ['documentation'],
    'documented_only must be enforced in the public snapshot',
  );
  assert.deepEqual(
    published.media.map(({ id }) => id),
    [assetId],
    'only presentation-referenced media must be exposed in the public snapshot',
  );

  const documentationLink = await db
    .selectFrom('system_links')
    .select('id')
    .where('system_id', '=', systemId)
    .where('kind', '=', 'documentation')
    .executeTakeFirstOrThrow();

  await db
    .updateTable('system_links')
    .set({ label_en: null, updated_at: new Date() })
    .where('id', '=', documentationLink.id)
    .execute();
  await markSystemDraft(db, { systemId, locale: 'en' });

  await assert.rejects(
    () => publishSystemLocalization(db, { systemId, locale: 'en' }),
    /requires a localized label for documentation link/,
    'documentation links must carry a locale-specific label before publication',
  );

  await db
    .updateTable('system_links')
    .set({
      label_en: 'Qualification documentation',
      updated_at: new Date(),
    })
    .where('id', '=', documentationLink.id)
    .execute();
  await publishSystemLocalization(db, { systemId, locale: 'en' });

  const publicationAssets = await db
    .selectFrom('system_publication_assets')
    .select(['asset_id'])
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .execute();
  assert.deepEqual(publicationAssets.map(({ asset_id }) => asset_id), [assetId]);

  await db
    .deleteFrom('system_assets')
    .where('system_id', '=', systemId)
    .where('asset_id', '=', assetId)
    .execute();

  let publishedAssetDeleteError: unknown;
  try {
    await db.deleteFrom('assets').where('id', '=', assetId).execute();
  } catch (error) {
    publishedAssetDeleteError = error;
  }
  assert.ok(publishedAssetDeleteError && typeof publishedAssetDeleteError === 'object');
  assert.equal((publishedAssetDeleteError as PostgreSqlError).code, '23503');
  assert.equal(
    (publishedAssetDeleteError as PostgreSqlError).constraint,
    'system_publication_assets_asset_fkey',
  );

  await db
    .insertInto('system_assets')
    .values({ system_id: systemId, asset_id: assetId, position: 0 })
    .execute();

  await db.updateTable('system_localizations').set({
    title: 'Unpublished draft title',
    presentation_document: {
      version: 1,
      blocks: [{ type: 'paragraph', text: 'Draft body without media.' }],
    },
    updated_at: new Date(),
  }).where('system_id', '=', systemId).where('locale', '=', 'en').execute();
  await markSystemDraft(db, { systemId, locale: 'en' });

  const stillPublished = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(stillPublished);
  assert.equal(
    stillPublished.title,
    'Published title',
    'draft edits must not mutate the public snapshot',
  );
  assert.deepEqual(stillPublished.media.map(({ id }) => id), [assetId]);

  const missingAssetId = randomUUID();
  await db.updateTable('system_localizations').set({
    presentation_document: {
      version: 1,
      blocks: [{ type: 'image', assetId: missingAssetId }],
    },
    updated_at: new Date(),
  }).where('system_id', '=', systemId).where('locale', '=', 'en').execute();

  await assert.rejects(
    () => publishSystemLocalization(db, { systemId, locale: 'en' }),
    /references unavailable presentation asset/,
    'publishing an image block that is not linked to the System must fail atomically',
  );

  const afterRejectedPublish = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(afterRejectedPublish);
  assert.equal(afterRejectedPublish.title, 'Published title');
  assert.deepEqual(afterRejectedPublish.media.map(({ id }) => id), [assetId]);

  await db.updateTable('system_localizations').set({
    title: 'Unpublished draft title',
    presentation_document: {
      version: 1,
      blocks: [{ type: 'paragraph', text: 'Republished body without media.' }],
    },
    updated_at: new Date(),
  }).where('system_id', '=', systemId).where('locale', '=', 'en').execute();

  await publishSystemLocalization(db, { systemId, locale: 'en' });
  const republished = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(republished);
  assert.equal(republished.title, 'Unpublished draft title');
  assert.deepEqual(
    republished.media,
    [],
    'republishing after removing the image block must retire the public media reference',
  );

  assert.equal(
    Number(
      (
        await db
          .selectFrom('system_publication_assets')
          .select(({ fn }) => fn.countAll<number>().as('count'))
          .where('system_id', '=', systemId)
          .where('locale', '=', 'en')
          .executeTakeFirstOrThrow()
      ).count,
    ),
    0,
  );

  let invalidSnapshotIdentityError: unknown;
  try {
    await sql`
      update system_publications
      set snapshot = jsonb_set(snapshot, '{slug}', '"wrong-slug"'::jsonb)
      where system_id = ${systemId}::uuid and locale = 'en'
    `.execute(db);
  } catch (error) {
    invalidSnapshotIdentityError = error;
  }
  assert.ok(invalidSnapshotIdentityError && typeof invalidSnapshotIdentityError === 'object');
  assert.equal((invalidSnapshotIdentityError as PostgreSqlError).code, '23514');
  assert.equal(
    (invalidSnapshotIdentityError as PostgreSqlError).constraint,
    'system_publications_snapshot_identity_check',
  );

  await unpublishSystemLocalization(db, { systemId, locale: 'en' });
  assert.equal(
    await getPublishedSystem(db, {
      locale: 'en',
      slug: 'snapshot-qualification',
    }),
    null,
  );

  await db
    .deleteFrom('system_assets')
    .where('system_id', '=', systemId)
    .where('asset_id', '=', assetId)
    .execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();

  process.stdout.write(
    'System publication snapshot qualification passed: draft isolation, evidence filtering, media reference integrity, rejected invalid publication, snapshot identity, republish retirement, and unpublish are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();
  await db.destroy();
}
