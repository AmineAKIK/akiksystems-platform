import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface TagPublicationSnapshot {
  version: 1;
  tagId: string;
  canonicalKey: string;
  locale: PlatformLocale;
  slug: string;
  name: string;
}

export interface PublishedTag extends TagPublicationSnapshot {
  publishedAt: Date;
  alternate: { locale: PlatformLocale; slug: string } | null;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(`Tag ${label} is required before publication.`);
  }
  return normalized;
}

export function parseTagPublicationSnapshot(
  value: unknown,
): TagPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Tag publication snapshot.');
  }
  return value as TagPublicationSnapshot;
}

export async function publishTagLocalization(
  db: Kysely<Database>,
  input: { tagId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('tags')
      .innerJoin(
        'tag_localizations',
        'tag_localizations.tag_id',
        'tags.id',
      )
      .select([
        'tags.id',
        'tags.canonical_key',
        'tag_localizations.slug',
        'tag_localizations.name',
      ])
      .where('tags.id', '=', input.tagId)
      .where('tag_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) {
      throw new Error('Tag localization not found.');
    }

    const snapshot: TagPublicationSnapshot = {
      version: 1,
      tagId: row.id,
      canonicalKey: row.canonical_key,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      name: requiredText(row.name, 'name'),
    };
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('tag_publications')
      .values({
        tag_id: input.tagId,
        locale: input.locale,
        slug: snapshot.slug,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['tag_id', 'locale']).doUpdateSet({
          slug: snapshot.slug,
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('tag_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('tag_id', '=', input.tagId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function unpublishTagLocalization(
  db: Kysely<Database>,
  input: { tagId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('tag_publications')
      .where('tag_id', '=', input.tagId)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('tag_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('tag_id', '=', input.tagId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function listPublishedTags(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<Array<TagPublicationSnapshot & { publishedAt: Date }>> {
  const rows = await db
    .selectFrom('tag_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseTagPublicationSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name, locale) ||
        left.tagId.localeCompare(right.tagId),
    );
}

export async function getPublishedTag(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedTag | null> {
  const row = await db
    .selectFrom('tag_publications')
    .select(['tag_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseTagPublicationSnapshot(row.snapshot);
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db
    .selectFrom('tag_publications')
    .select(['locale', 'slug'])
    .where('tag_id', '=', row.tag_id)
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
