import type {
  PlatformLocale,
  WritingEditorialWeight,
  WritingKind,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface WritingPublicationSnapshot {
  version: 1;
  writingId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  kind: WritingKind;
  editorialWeight: WritingEditorialWeight;
  editorialPosition: number;
}

export interface PublishedWritingListItem extends WritingPublicationSnapshot {
  publishedAt: Date;
}

export interface PublishedWriting extends PublishedWritingListItem {
  alternate: { locale: PlatformLocale; slug: string } | null;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(`Writing ${label} is required before publication.`);
  }
  return normalized;
}

function parseSnapshot(value: unknown): WritingPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Writing publication snapshot.');
  }
  return value as WritingPublicationSnapshot;
}

export async function publishWritingLocalization(
  db: Kysely<Database>,
  input: { writingId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('writings')
      .innerJoin(
        'writing_localizations',
        'writing_localizations.writing_id',
        'writings.id',
      )
      .select([
        'writings.id',
        'writings.kind',
        'writings.editorial_weight',
        'writings.editorial_position',
        'writing_localizations.slug',
        'writing_localizations.title',
        'writing_localizations.summary',
        'writing_localizations.body',
      ])
      .where('writings.id', '=', input.writingId)
      .where('writing_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) {
      throw new Error('Writing localization not found.');
    }

    const snapshot: WritingPublicationSnapshot = {
      version: 1,
      writingId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      kind: row.kind,
      editorialWeight: row.editorial_weight,
      editorialPosition: row.editorial_position,
    };
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('writing_publications')
      .values({
        writing_id: input.writingId,
        locale: input.locale,
        slug: snapshot.slug,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['writing_id', 'locale']).doUpdateSet({
          slug: snapshot.slug,
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('writing_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('writing_id', '=', input.writingId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function unpublishWritingLocalization(
  db: Kysely<Database>,
  input: { writingId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('writing_publications')
      .where('writing_id', '=', input.writingId)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('writing_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('writing_id', '=', input.writingId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function listPublishedWritings(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedWritingListItem[]> {
  const rows = await db
    .selectFrom('writing_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.writingId.localeCompare(right.writingId),
    );
}

export async function getPublishedWriting(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedWriting | null> {
  const row = await db
    .selectFrom('writing_publications')
    .select(['writing_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseSnapshot(row.snapshot);
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db
    .selectFrom('writing_publications')
    .select(['locale', 'slug'])
    .where('writing_id', '=', row.writing_id)
    .where('locale', '=', alternateLocale)
    .executeTakeFirst();

  return {
    ...snapshot,
    publishedAt: row.published_at,
    alternate:
      alternate === undefined
        ? null
        : { locale: alternate.locale, slug: alternate.slug },
  };
}
