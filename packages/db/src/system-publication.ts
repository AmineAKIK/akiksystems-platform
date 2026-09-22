import {
  isSystemLinkAllowedByEvidencePolicy,
  systemEvidencePolicies,
  systemLinkKinds,
  systemPresentationKinds,
  validatePresentationDocument,
  validateSystemPublicationReadiness,
  type PlatformLocale,
  type PresentationDocument,
  type SystemEvidencePolicy,
  type SystemLinkKind,
  type SystemPresentationKind,
} from '@akiksystems/core';
import type { Kysely, Transaction } from 'kysely';

import { lockSystemMutation } from './system-mutation-lock.js';
import type { Database } from './schema.js';

export interface SystemPublicationTechnology {
  id: string;
  slug: string;
  name: string;
  position: number;
}

export interface SystemPublicationOrigin {
  id: string;
  title: string;
  summary: string | null;
}

export interface SystemPublicationLink {
  id: string;
  kind: SystemLinkKind;
  url: string;
  label: string | null;
  position: number;
}

export interface SystemPublicationMedia {
  id: string;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  position: number;
}

export interface SystemPublicationSnapshot {
  version: 1;
  systemId: string;
  locale: PlatformLocale;
  presentationKind: SystemPresentationKind;
  evidencePolicy: SystemEvidencePolicy;
  slug: string;
  title: string;
  summary: string;
  proofTransparency: {
    role: string;
    maturity: string;
    demoNature: string;
    dataNature: string;
    limits: string;
  };
  presentationDocument: PresentationDocument;
  technologies: SystemPublicationTechnology[];
  origin: SystemPublicationOrigin | null;
  links: SystemPublicationLink[];
  media: SystemPublicationMedia[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isPosition(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPublicationTechnology(
  value: unknown,
): value is SystemPublicationTechnology {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    isPosition(value.position)
  );
}

function isPublicationOrigin(value: unknown): value is SystemPublicationOrigin {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isNullableString(value.summary)
  );
}

function isPublicationLink(value: unknown): value is SystemPublicationLink {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    systemLinkKinds.includes(value.kind as SystemLinkKind) &&
    typeof value.url === 'string' &&
    isNullableString(value.label) &&
    isPosition(value.position)
  );
}

function isPublicationMedia(value: unknown): value is SystemPublicationMedia {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.mimeType === 'string' &&
    isNullableString(value.altText) &&
    isNullableString(value.caption) &&
    (value.width === null ||
      (typeof value.width === 'number' &&
        Number.isInteger(value.width) &&
        value.width > 0)) &&
    (value.height === null ||
      (typeof value.height === 'number' &&
        Number.isInteger(value.height) &&
        value.height > 0)) &&
    isPosition(value.position)
  );
}

function isPublicationSnapshot(value: unknown): value is SystemPublicationSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  const proofTransparency = value.proofTransparency;
  const presentation = validatePresentationDocument(value.presentationDocument);

  return (
    value.version === 1 &&
    typeof value.systemId === 'string' &&
    (value.locale === 'en' || value.locale === 'fr') &&
    typeof value.presentationKind === 'string' &&
    systemPresentationKinds.includes(
      value.presentationKind as SystemPresentationKind,
    ) &&
    typeof value.evidencePolicy === 'string' &&
    systemEvidencePolicies.includes(
      value.evidencePolicy as SystemEvidencePolicy,
    ) &&
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    isRecord(proofTransparency) &&
    typeof proofTransparency.role === 'string' &&
    typeof proofTransparency.maturity === 'string' &&
    typeof proofTransparency.demoNature === 'string' &&
    typeof proofTransparency.dataNature === 'string' &&
    typeof proofTransparency.limits === 'string' &&
    presentation.success &&
    Array.isArray(value.technologies) &&
    value.technologies.every(isPublicationTechnology) &&
    (value.origin === null || isPublicationOrigin(value.origin)) &&
    Array.isArray(value.links) &&
    value.links.every(isPublicationLink) &&
    Array.isArray(value.media) &&
    value.media.every(isPublicationMedia)
  );
}

export function parseSystemPublicationSnapshot(
  value: unknown,
): SystemPublicationSnapshot | null {
  return isPublicationSnapshot(value) ? value : null;
}

async function publicationSource(
  db: Kysely<Database> | Transaction<Database>,
  systemId: string,
  locale: PlatformLocale,
): Promise<SystemPublicationSnapshot> {
  const row = await db
    .selectFrom('systems')
    .innerJoin(
      'system_localizations',
      'system_localizations.system_id',
      'systems.id',
    )
    .select([
      'systems.id',
      'systems.presentation_kind',
      'systems.evidence_policy',
      'system_localizations.slug',
      'system_localizations.title',
      'system_localizations.summary',
      'system_localizations.proof_role',
      'system_localizations.proof_maturity',
      'system_localizations.proof_demo_nature',
      'system_localizations.proof_data_nature',
      'system_localizations.proof_limits',
      'system_localizations.presentation_document',
    ])
    .where('systems.id', '=', systemId)
    .where('system_localizations.locale', '=', locale)
    .executeTakeFirst();

  if (row === undefined) {
    throw new Error(`System localization ${systemId}:${locale} does not exist.`);
  }

  const readiness = validateSystemPublicationReadiness({
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    proofRole: row.proof_role,
    proofMaturity: row.proof_maturity,
    proofDemoNature: row.proof_demo_nature,
    proofDataNature: row.proof_data_nature,
    proofLimits: row.proof_limits,
    presentationDocument: row.presentation_document,
  });

  if (!readiness.ready) {
    throw new Error(
      `System localization ${systemId}:${locale} is not publication-ready: ${readiness.errors.join(' ')}`,
    );
  }

  const presentationAssetIds = [
    ...new Set(
      row.presentation_document!.blocks.flatMap((block) =>
        block.type === 'image' ? [block.assetId] : [],
      ),
    ),
  ];

  const [technologies, origin, rawLinks, media] = await Promise.all([
    db
      .selectFrom('system_technologies')
      .innerJoin(
        'technologies',
        'technologies.id',
        'system_technologies.technology_id',
      )
      .select([
        'technologies.id',
        'technologies.slug',
        'technologies.name',
        'system_technologies.position',
      ])
      .where('system_technologies.system_id', '=', systemId)
      .orderBy('system_technologies.position')
      .execute(),
    db
      .selectFrom('system_experiences')
      .innerJoin(
        'experience_localizations',
        'experience_localizations.experience_id',
        'system_experiences.experience_id',
      )
      .select([
        'system_experiences.experience_id as id',
        'experience_localizations.title',
        'experience_localizations.summary',
      ])
      .where('system_experiences.system_id', '=', systemId)
      .where('system_experiences.relation_kind', '=', 'origin_context')
      .where('experience_localizations.locale', '=', locale)
      .executeTakeFirst(),
    db
      .selectFrom('system_links')
      .select(['id', 'kind', 'url', 'label_en', 'label_fr', 'position'])
      .where('system_id', '=', systemId)
      .orderBy('position')
      .execute(),
    db
      .selectFrom('system_assets')
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .leftJoin(
        'asset_localizations',
        (join) =>
          join
            .onRef('asset_localizations.asset_id', '=', 'assets.id')
            .on('asset_localizations.locale', '=', locale),
      )
      .select([
        'assets.id',
        'assets.mime_type',
        'assets.width',
        'assets.height',
        'asset_localizations.alt_text',
        'asset_localizations.caption',
        'system_assets.position',
      ])
      .where('system_assets.system_id', '=', systemId)
      .orderBy('system_assets.position')
      .execute(),
  ]);

  const availableMediaById = new Map(
    media.map((asset) => [asset.id, asset] as const),
  );
  const missingPresentationAssetId = presentationAssetIds.find(
    (assetId) => !availableMediaById.has(assetId),
  );
  if (missingPresentationAssetId !== undefined) {
    throw new Error(
      `System localization ${systemId}:${locale} references unavailable presentation asset ${missingPresentationAssetId}.`,
    );
  }

  const invalidPresentationMedia = presentationAssetIds
    .map((assetId) => availableMediaById.get(assetId)!)
    .find((asset) => !asset.mime_type.startsWith('image/'));
  if (invalidPresentationMedia !== undefined) {
    throw new Error(
      `System localization ${systemId}:${locale} uses non-image asset ${invalidPresentationMedia.id} in an image block.`,
    );
  }

  const missingAltTextMedia = presentationAssetIds
    .map((assetId) => availableMediaById.get(assetId)!)
    .find(
      (asset) =>
        asset.alt_text === null || asset.alt_text.trim().length === 0,
    );
  if (missingAltTextMedia !== undefined) {
    throw new Error(
      `System localization ${systemId}:${locale} requires localized alt text for presentation image ${missingAltTextMedia.id}.`,
    );
  }

  const links = rawLinks.filter((link) =>
    isSystemLinkAllowedByEvidencePolicy(row.evidence_policy, link.kind),
  );

  const unlabeledDocumentation = links.find(
    (link) =>
      link.kind === 'documentation' &&
      (locale === 'fr' ? link.label_fr : link.label_en) === null,
  );
  if (unlabeledDocumentation !== undefined) {
    throw new Error(
      `System localization ${systemId}:${locale} requires a localized label for documentation link ${unlabeledDocumentation.url}.`,
    );
  }

  return {
    version: 1,
    systemId: row.id,
    locale,
    presentationKind: row.presentation_kind,
    evidencePolicy: row.evidence_policy,
    slug: row.slug!,
    title: row.title!,
    summary: row.summary!,
    proofTransparency: {
      role: row.proof_role!,
      maturity: row.proof_maturity!,
      demoNature: row.proof_demo_nature!,
      dataNature: row.proof_data_nature!,
      limits: row.proof_limits!,
    },
    presentationDocument: row.presentation_document!,
    technologies,
    origin: origin ?? null,
    links: links.map((link) => ({
      id: link.id,
      kind: link.kind,
      url: link.url,
      label: locale === 'fr' ? link.label_fr : link.label_en,
      position: link.position,
    })),
    media: media
      .filter((asset) => presentationAssetIds.includes(asset.id))
      .map((asset) => ({
        id: asset.id,
        mimeType: asset.mime_type,
        altText: asset.alt_text,
        caption: asset.caption,
        width: asset.width,
        height: asset.height,
        position: asset.position,
      })),
  };
}

export async function buildSystemPublicationSnapshot(
  db: Kysely<Database> | Transaction<Database>,
  input: { systemId: string; locale: PlatformLocale },
): Promise<SystemPublicationSnapshot> {
  return publicationSource(db, input.systemId, input.locale);
}

async function replacePublicationAssetReferences(
  db: Transaction<Database>,
  snapshot: SystemPublicationSnapshot,
): Promise<void> {
  await db
    .deleteFrom('system_publication_assets')
    .where('system_id', '=', snapshot.systemId)
    .where('locale', '=', snapshot.locale)
    .execute();

  if (snapshot.media.length === 0) {
    return;
  }

  await db
    .insertInto('system_publication_assets')
    .values(
      snapshot.media.map((media) => ({
        system_id: snapshot.systemId,
        locale: snapshot.locale,
        asset_id: media.id,
      })),
    )
    .execute();
}

export async function publishSystemLocalizationInTransaction(
  transaction: Transaction<Database>,
  input: { systemId: string; locale: PlatformLocale; now?: Date },
): Promise<SystemPublicationSnapshot> {
  const now = input.now ?? new Date();
  await lockSystemMutation(transaction, input.systemId);
  const snapshot = await publicationSource(
    transaction,
    input.systemId,
    input.locale,
  );

  await transaction
    .insertInto('system_publications')
    .values({
      system_id: input.systemId,
      locale: input.locale,
      slug: snapshot.slug,
      snapshot: snapshot as unknown as Record<string, unknown>,
      published_at: now,
      updated_at: now,
    })
    .onConflict((conflict) =>
      conflict.columns(['system_id', 'locale']).doUpdateSet({
        slug: snapshot.slug,
        snapshot: snapshot as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      }),
    )
    .execute();

  await replacePublicationAssetReferences(transaction, snapshot);

  await transaction
    .updateTable('system_localizations')
    .set({
      editorial_state: 'published',
      published_at: now,
      updated_at: now,
    })
    .where('system_id', '=', input.systemId)
    .where('locale', '=', input.locale)
    .execute();

  return snapshot;
}

export async function publishSystemLocalization(
  db: Kysely<Database>,
  input: { systemId: string; locale: PlatformLocale; now?: Date },
): Promise<SystemPublicationSnapshot> {
  return db.transaction().execute((transaction) =>
    publishSystemLocalizationInTransaction(transaction, input),
  );
}

export async function unpublishSystemLocalizationInTransaction(
  transaction: Transaction<Database>,
  input: { systemId: string; locale: PlatformLocale; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  await lockSystemMutation(transaction, input.systemId);

  await transaction
    .deleteFrom('system_publications')
    .where('system_id', '=', input.systemId)
    .where('locale', '=', input.locale)
    .execute();

  await transaction
    .updateTable('system_localizations')
    .set({
      editorial_state: 'draft',
      published_at: null,
      updated_at: now,
    })
    .where('system_id', '=', input.systemId)
    .where('locale', '=', input.locale)
    .execute();
}

export async function unpublishSystemLocalization(
  db: Kysely<Database>,
  input: { systemId: string; locale: PlatformLocale; now?: Date },
): Promise<void> {
  await db.transaction().execute((transaction) =>
    unpublishSystemLocalizationInTransaction(transaction, input),
  );
}

export async function markSystemDraft(
  db: Kysely<Database> | Transaction<Database>,
  input: { systemId: string; locale?: PlatformLocale; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  let query = db
    .updateTable('system_localizations')
    .set({
      editorial_state: 'draft',
      published_at: null,
      updated_at: now,
    })
    .where('system_id', '=', input.systemId);

  if (input.locale !== undefined) {
    query = query.where('locale', '=', input.locale);
  }

  await query.execute();
}


export async function bootstrapSystemPublications(
  db: Kysely<Database>,
): Promise<{ created: number }> {
  const candidates = await db
    .selectFrom('system_localizations')
    .select(['system_id', 'locale', 'published_at'])
    .where('editorial_state', '=', 'published')
    .where('published_at', 'is not', null)
    .execute();

  let created = 0;
  for (const candidate of candidates) {
    const existing = await db
      .selectFrom('system_publications')
      .select('system_id')
      .where('system_id', '=', candidate.system_id)
      .where('locale', '=', candidate.locale)
      .executeTakeFirst();

    if (existing !== undefined) {
      continue;
    }

    await db.transaction().execute(async (transaction) => {
      const snapshot = await publicationSource(
        transaction,
        candidate.system_id,
        candidate.locale,
      );
      await transaction
        .insertInto('system_publications')
        .values({
          system_id: candidate.system_id,
          locale: candidate.locale,
          slug: snapshot.slug,
          snapshot: snapshot as unknown as Record<string, unknown>,
          published_at: candidate.published_at!,
          updated_at: new Date(),
        })
        .execute();

      await replacePublicationAssetReferences(transaction, snapshot);
    });

    created += 1;
  }

  return { created };
}
