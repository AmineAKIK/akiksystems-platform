import { randomUUID } from 'node:crypto';

import { createDatabase } from '@akiksystems/db';

import { putAssetObject } from '../app/lib/asset-storage.server';

const qualificationGuard = 'sentinel-l1';

if (process.env.AKIKSYSTEMS_STAGING_SEED !== qualificationGuard) {
  throw new Error(
    'Refusing to seed Sentinel without AKIKSYSTEMS_STAGING_SEED=sentinel-l1.',
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim() === '') {
  throw new Error('DATABASE_URL is required.');
}

const db = createDatabase(databaseUrl);

const storageKey = 'qualification/l1/sentinel-proof.png';
const proofPng = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);

async function ensureSentinelSystem(): Promise<string> {
  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'sentinel')
    .executeTakeFirst();

  if (existing !== undefined) {
    await db
      .updateTable('systems')
      .set({
        lifecycle: 'active',
        archived_at: null,
        updated_at: new Date(),
      })
      .where('id', '=', existing.system_id)
      .execute();

    return existing.system_id;
  }

  const systemId = randomUUID();
  await db
    .insertInto('systems')
    .values({
      id: systemId,
      lifecycle: 'active',
      archived_at: null,
    })
    .execute();

  return systemId;
}

async function ensureAsset(systemId: string): Promise<string> {
  const file = new File([proofPng], 'sentinel-proof.png', {
    type: 'image/png',
  });
  await putAssetObject(storageKey, file);

  const existingAsset = await db
    .selectFrom('assets')
    .select('id')
    .where('storage_key', '=', storageKey)
    .executeTakeFirst();

  const assetId = existingAsset?.id ?? randomUUID();

  if (existingAsset === undefined) {
    await db
      .insertInto('assets')
      .values({
        id: assetId,
        storage_key: storageKey,
        original_filename: 'sentinel-proof.png',
        mime_type: 'image/png',
        byte_size: proofPng.byteLength,
      })
      .execute();
  } else {
    await db
      .updateTable('assets')
      .set({
        original_filename: 'sentinel-proof.png',
        mime_type: 'image/png',
        byte_size: proofPng.byteLength,
        updated_at: new Date(),
      })
      .where('id', '=', assetId)
      .execute();
  }

  for (const localization of [
    {
      locale: 'en' as const,
      altText: 'Sentinel L1 staging qualification proof',
      caption: 'L1 staging qualification asset.',
    },
    {
      locale: 'fr' as const,
      altText: 'Preuve de qualification staging Sentinel L1',
      caption: 'Asset de qualification staging L1.',
    },
  ]) {
    const existing = await db
      .selectFrom('asset_localizations')
      .select('asset_id')
      .where('asset_id', '=', assetId)
      .where('locale', '=', localization.locale)
      .executeTakeFirst();

    if (existing === undefined) {
      await db
        .insertInto('asset_localizations')
        .values({
          asset_id: assetId,
          locale: localization.locale,
          alt_text: localization.altText,
          caption: localization.caption,
        })
        .execute();
    } else {
      await db
        .updateTable('asset_localizations')
        .set({
          alt_text: localization.altText,
          caption: localization.caption,
          updated_at: new Date(),
        })
        .where('asset_id', '=', assetId)
        .where('locale', '=', localization.locale)
        .execute();
    }
  }

  const relation = await db
    .selectFrom('system_assets')
    .select(['asset_id', 'position'])
    .where('system_id', '=', systemId)
    .where('asset_id', '=', assetId)
    .executeTakeFirst();

  if (relation === undefined) {
    const existingRelations = await db
      .selectFrom('system_assets')
      .select('position')
      .where('system_id', '=', systemId)
      .orderBy('position', 'desc')
      .execute();

    const nextPosition =
      existingRelations.length === 0 ? 0 : existingRelations[0]!.position + 1;

    await db
      .insertInto('system_assets')
      .values({
        system_id: systemId,
        asset_id: assetId,
        position: nextPosition,
      })
      .execute();
  }

  return assetId;
}

async function ensureTechnology(
  systemId: string,
  slug: string,
  name: string,
): Promise<void> {
  const existingTechnology = await db
    .selectFrom('technologies')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirst();

  const technologyId = existingTechnology?.id ?? randomUUID();

  if (existingTechnology === undefined) {
    await db
      .insertInto('technologies')
      .values({ id: technologyId, slug, name })
      .execute();
  } else {
    await db
      .updateTable('technologies')
      .set({ name, updated_at: new Date() })
      .where('id', '=', technologyId)
      .execute();
  }

  const existingRelation = await db
    .selectFrom('system_technologies')
    .select('technology_id')
    .where('system_id', '=', systemId)
    .where('technology_id', '=', technologyId)
    .executeTakeFirst();

  if (existingRelation !== undefined) {
    return;
  }

  const relations = await db
    .selectFrom('system_technologies')
    .select('position')
    .where('system_id', '=', systemId)
    .orderBy('position', 'desc')
    .execute();

  await db
    .insertInto('system_technologies')
    .values({
      system_id: systemId,
      technology_id: technologyId,
      position: relations.length === 0 ? 0 : relations[0]!.position + 1,
    })
    .execute();
}

async function ensureOrigin(systemId: string): Promise<void> {
  const existingRelation = await db
    .selectFrom('system_experiences')
    .select('experience_id')
    .where('system_id', '=', systemId)
    .where('relation_kind', '=', 'origin_context')
    .executeTakeFirst();

  const experienceId = existingRelation?.experience_id ?? randomUUID();

  if (existingRelation === undefined) {
    await db.insertInto('experiences').values({ id: experienceId }).execute();
    await db
      .insertInto('system_experiences')
      .values({
        system_id: systemId,
        experience_id: experienceId,
        relation_kind: 'origin_context',
      })
      .execute();
  }

  for (const localization of [
    {
      locale: 'en' as const,
      title: 'Industrial operations context',
      summary:
        'Sentinel originated from the need to turn operational signals into inspectable evidence.',
    },
    {
      locale: 'fr' as const,
      title: 'Contexte des opérations industrielles',
      summary:
        'Sentinel est né du besoin de transformer des signaux opérationnels en preuves inspectables.',
    },
  ]) {
    const existing = await db
      .selectFrom('experience_localizations')
      .select('experience_id')
      .where('experience_id', '=', experienceId)
      .where('locale', '=', localization.locale)
      .executeTakeFirst();

    if (existing === undefined) {
      await db
        .insertInto('experience_localizations')
        .values({
          experience_id: experienceId,
          locale: localization.locale,
          title: localization.title,
          summary: localization.summary,
        })
        .execute();
    } else {
      await db
        .updateTable('experience_localizations')
        .set({
          title: localization.title,
          summary: localization.summary,
          updated_at: new Date(),
        })
        .where('experience_id', '=', experienceId)
        .where('locale', '=', localization.locale)
        .execute();
    }
  }
}

async function ensureExternalLink(systemId: string): Promise<void> {
  const url = 'https://github.com/AmineAKIK/sentinel-fullstack';
  const existing = await db
    .selectFrom('system_links')
    .select('id')
    .where('system_id', '=', systemId)
    .where('kind', '=', 'repository')
    .where('url', '=', url)
    .executeTakeFirst();

  if (existing !== undefined) {
    return;
  }

  const links = await db
    .selectFrom('system_links')
    .select('position')
    .where('system_id', '=', systemId)
    .orderBy('position', 'desc')
    .execute();

  await db
    .insertInto('system_links')
    .values({
      id: randomUUID(),
      system_id: systemId,
      kind: 'repository',
      url,
      position: links.length === 0 ? 0 : links[0]!.position + 1,
    })
    .execute();
}

async function publishLocalization(
  systemId: string,
  locale: 'en' | 'fr',
  assetId: string,
): Promise<void> {
  const content =
    locale === 'en'
      ? {
          title: 'Sentinel',
          summary:
            'Operational visibility built from industrial context and inspectable evidence.',
          paragraph:
            'Sentinel turns operational signals into a calm, inspectable system.',
        }
      : {
          title: 'Sentinel',
          summary:
            'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
          paragraph:
            'Sentinel transforme les signaux opérationnels en un système calme et inspectable.',
        };

  const presentationDocument = {
    version: 1 as const,
    blocks: [
      { type: 'paragraph' as const, text: content.paragraph },
      { type: 'image' as const, assetId },
    ],
  };

  const existing = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('system_id', '=', systemId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  if (existing === undefined) {
    await db
      .insertInto('system_localizations')
      .values({
        system_id: systemId,
        locale,
        slug: 'sentinel',
        title: content.title,
        summary: content.summary,
        presentation_document: presentationDocument,
        editorial_state: 'published',
        published_at: new Date(),
      })
      .execute();
  } else {
    await db
      .updateTable('system_localizations')
      .set({
        slug: 'sentinel',
        title: content.title,
        summary: content.summary,
        presentation_document: presentationDocument,
        editorial_state: 'published',
        published_at: new Date(),
        updated_at: new Date(),
      })
      .where('system_id', '=', systemId)
      .where('locale', '=', locale)
      .execute();
  }
}

try {
  const systemId = await ensureSentinelSystem();
  const assetId = await ensureAsset(systemId);

  await ensureTechnology(systemId, 'typescript', 'TypeScript');
  await ensureTechnology(systemId, 'react', 'React');
  await ensureTechnology(systemId, 'postgresql', 'PostgreSQL');
  await ensureOrigin(systemId);
  await ensureExternalLink(systemId);
  await publishLocalization(systemId, 'en', assetId);
  await publishLocalization(systemId, 'fr', assetId);

  process.stdout.write(
    `Staging Sentinel qualification fixture ready: system=${systemId}, asset=${assetId}, locales=en,fr.\n`,
  );
} finally {
  await db.destroy();
}
