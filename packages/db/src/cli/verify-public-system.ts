import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { getPublishedSystem } from '../public-system.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();
const technologyId = randomUUID();
const experienceId = randomUUID();
const linkId = randomUUID();
const assetId = randomUUID();

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.transaction().execute(async (transaction) => {
    await transaction.insertInto('systems').values({ id: systemId }).execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: systemId,
          locale: 'en',
          slug: 'public-sentinel-proof',
          title: 'Public Sentinel',
          summary: 'Published public summary.',
          presentation_document: {
            version: 1,
            blocks: [{ type: 'paragraph', text: 'Published presentation.' }],
          },
          editorial_state: 'draft',
          published_at: null,
        },
        {
          system_id: systemId,
          locale: 'fr',
          slug: 'sentinel-prive-preuve',
          title: 'Sentinel brouillon',
          summary: 'Résumé brouillon.',
          presentation_document: {
            version: 1,
            blocks: [{ type: 'paragraph', text: 'Présentation brouillon.' }],
          },
          editorial_state: 'draft',
          published_at: null,
        },
      ])
      .execute();

    await transaction
      .insertInto('technologies')
      .values({ id: technologyId, slug: 'typescript-proof', name: 'TypeScript' })
      .execute();
    await transaction
      .insertInto('system_technologies')
      .values({ system_id: systemId, technology_id: technologyId, position: 0 })
      .execute();

    await transaction
      .insertInto('experiences')
      .values({ id: experienceId })
      .execute();
    await transaction
      .insertInto('experience_localizations')
      .values([
        {
          experience_id: experienceId,
          locale: 'en',
          title: 'Origin proof',
          summary: 'Public origin summary.',
        },
        {
          experience_id: experienceId,
          locale: 'fr',
          title: 'Origine privée',
          summary: 'Résumé privé.',
        },
      ])
      .execute();
    await transaction
      .insertInto('system_experiences')
      .values({
        system_id: systemId,
        experience_id: experienceId,
        relation_kind: 'origin_context',
      })
      .execute();

    await transaction
      .insertInto('system_links')
      .values({
        id: linkId,
        system_id: systemId,
        kind: 'repository',
        url: 'https://example.invalid/repository',
        position: 0,
      })
      .execute();

    await transaction
      .insertInto('assets')
      .values({
        id: assetId,
        storage_key: `private/${assetId}.png`,
        original_filename: 'secret-internal-name.png',
        mime_type: 'image/png',
        byte_size: 42,
      })
      .execute();
    await transaction
      .insertInto('asset_localizations')
      .values([
        {
          asset_id: assetId,
          locale: 'en',
          alt_text: 'Public image alt',
          caption: 'Public image caption',
        },
        {
          asset_id: assetId,
          locale: 'fr',
          alt_text: 'Texte brouillon privé',
          caption: 'Légende brouillon privée',
        },
      ])
      .execute();
    await transaction
      .insertInto('system_assets')
      .values({ system_id: systemId, asset_id: assetId, position: 0 })
      .execute();
  });

  assert.equal(
    await getPublishedSystem(db, { locale: 'en', slug: 'public-sentinel-proof' }),
    null,
    'draft localization must not be public',
  );

  await db
    .updateTable('system_localizations')
    .set({
      editorial_state: 'published',
      published_at: new Date(),
      updated_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .execute();

  const published = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'public-sentinel-proof',
  });

  assert.ok(published !== null);
  assert.equal(published.id, systemId);
  assert.equal(published.locale, 'en');
  assert.equal(published.slug, 'public-sentinel-proof');
  assert.equal(published.title, 'Public Sentinel');
  assert.equal(published.summary, 'Published public summary.');
  assert.equal(published.technologies.length, 1);
  assert.equal(published.technologies[0]?.slug, 'typescript-proof');
  assert.equal(published.origin?.title, 'Origin proof');
  assert.equal(published.links[0]?.kind, 'repository');
  assert.equal(published.media[0]?.altText, 'Public image alt');
  assert.equal(published.media[0]?.caption, 'Public image caption');

  assert.equal(
    await getPublishedSystem(db, { locale: 'fr', slug: 'sentinel-prive-preuve' }),
    null,
    'draft FR localization must remain invisible while EN is published',
  );

  const serialized = JSON.stringify(published);
  assert.doesNotMatch(serialized, /secret-internal-name/);
  assert.doesNotMatch(serialized, /private\//);
  assert.doesNotMatch(serialized, /Sentinel brouillon/);
  assert.doesNotMatch(serialized, /Résumé brouillon/);
  assert.doesNotMatch(serialized, /Texte brouillon privé/);
  assert.doesNotMatch(serialized, /Légende brouillon privée/);
  assert.doesNotMatch(serialized, /actor_email|admin_audit_events|editorial_state/);

  await db
    .updateTable('systems')
    .set({ lifecycle: 'archived', archived_at: new Date(), updated_at: new Date() })
    .where('id', '=', systemId)
    .execute();

  assert.equal(
    await getPublishedSystem(db, { locale: 'en', slug: 'public-sentinel-proof' }),
    null,
    'archived System must not be public even when localization remains published',
  );

  process.stdout.write(
    'Public System verification passed: drafts and archived Systems stay invisible, published projection is coherent, and admin/private fields are excluded.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.deleteFrom('technologies').where('id', '=', technologyId).execute();
  await db.deleteFrom('experiences').where('id', '=', experienceId).execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();
  await db.destroy();
}
