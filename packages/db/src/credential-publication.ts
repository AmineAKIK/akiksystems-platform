import type { CredentialKind, PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface CredentialPublicationSnapshot {
  version: 1;
  credentialId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  kind: CredentialKind;
  issuer: string;
  issuedOn: string | null;
  trainingId: string | null;
  sourceAssetId: string | null;
  verificationUrl: string | null;
  editorialPosition: number;
}

export interface PublicCredentialTraining {
  trainingId: string;
  slug: string;
  title: string;
}

export interface PublishedCredential extends CredentialPublicationSnapshot {
  publishedAt: Date;
  alternate: { locale: PlatformLocale; slug: string } | null;
  training: PublicCredentialTraining | null;
}

export interface PublishedCredentialListItem
  extends CredentialPublicationSnapshot {
  publishedAt: Date;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(`Credential ${label} is required before publication.`);
  }
  return normalized;
}

function parseSnapshot(value: unknown): CredentialPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Credential publication snapshot.');
  }
  return value as CredentialPublicationSnapshot;
}

function dateOnly(value: unknown): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  throw new Error('Invalid Credential date value.');
}

export async function publishCredentialLocalization(
  db: Kysely<Database>,
  input: { credentialId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('credentials')
      .innerJoin(
        'credential_localizations',
        'credential_localizations.credential_id',
        'credentials.id',
      )
      .select([
        'credentials.id',
        'credentials.kind',
        'credentials.issuer',
        'credentials.issued_on',
        'credentials.training_id',
        'credentials.source_asset_id',
        'credentials.verification_url',
        'credentials.editorial_position',
        'credential_localizations.slug',
        'credential_localizations.title',
        'credential_localizations.summary',
        'credential_localizations.body',
      ])
      .where('credentials.id', '=', input.credentialId)
      .where('credential_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) throw new Error('Credential localization not found.');

    const snapshot: CredentialPublicationSnapshot = {
      version: 1,
      credentialId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      kind: row.kind,
      issuer: requiredText(row.issuer, 'issuer'),
      issuedOn: dateOnly(row.issued_on),
      trainingId: row.training_id,
      sourceAssetId: row.source_asset_id,
      verificationUrl: row.verification_url?.trim() || null,
      editorialPosition: row.editorial_position,
    };
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('credential_publications')
      .values({
        credential_id: input.credentialId,
        locale: input.locale,
        slug: snapshot.slug,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['credential_id', 'locale']).doUpdateSet({
          slug: snapshot.slug,
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('credential_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('credential_id', '=', input.credentialId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function unpublishCredentialLocalization(
  db: Kysely<Database>,
  input: { credentialId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('credential_publications')
      .where('credential_id', '=', input.credentialId)
      .where('locale', '=', input.locale)
      .execute();
    await transaction
      .updateTable('credential_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('credential_id', '=', input.credentialId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function listPublishedCredentials(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedCredentialListItem[]> {
  const rows = await db
    .selectFrom('credential_publications')
    .innerJoin(
      'credentials',
      'credentials.id',
      'credential_publications.credential_id',
    )
    .select([
      'credential_publications.snapshot',
      'credential_publications.published_at',
    ])
    .where('credential_publications.locale', '=', locale)
    .orderBy('credentials.editorial_position')
    .orderBy('credentials.created_at')
    .execute();

  return rows.map((row) => ({
    ...parseSnapshot(row.snapshot),
    publishedAt: row.published_at,
  }));
}

export async function listPublishedCredentialsForTraining(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; trainingId: string },
): Promise<PublishedCredentialListItem[]> {
  const rows = await db
    .selectFrom('credential_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .filter((credential) => credential.trainingId === input.trainingId)
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.credentialId.localeCompare(right.credentialId),
    );
}

export async function getPublishedCredential(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedCredential | null> {
  const row = await db
    .selectFrom('credential_publications')
    .select(['credential_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseSnapshot(row.snapshot);
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db
    .selectFrom('credential_publications')
    .select(['locale', 'slug'])
    .where('credential_id', '=', row.credential_id)
    .where('locale', '=', alternateLocale)
    .executeTakeFirst();

  let training: PublicCredentialTraining | null = null;
  if (snapshot.trainingId !== null) {
    const trainingPublication = await db
      .selectFrom('training_publications')
      .select(['snapshot'])
      .where('training_id', '=', snapshot.trainingId)
      .where('locale', '=', input.locale)
      .executeTakeFirst();

    if (trainingPublication !== undefined) {
      const value = trainingPublication.snapshot as {
        trainingId?: unknown;
        slug?: unknown;
        title?: unknown;
      };
      if (
        typeof value.trainingId === 'string' &&
        typeof value.slug === 'string' &&
        typeof value.title === 'string'
      ) {
        training = {
          trainingId: value.trainingId,
          slug: value.slug,
          title: value.title,
        };
      }
    }
  }

  return {
    ...snapshot,
    publishedAt: row.published_at,
    alternate:
      alternate === undefined
        ? null
        : { locale: alternate.locale, slug: alternate.slug },
    training,
  };
}
