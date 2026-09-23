import type {
  PlatformLocale,
  WritingEditorialWeight,
  WritingKind,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import {
  parseCategoryPublicationSnapshot,
  type CategoryPublicationSnapshot,
} from './category-publication.js';
import type { Database } from './schema.js';

export interface WritingPublicationSnapshot {
  version: 2;
  writingId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  kind: WritingKind;
  editorialWeight: WritingEditorialWeight;
  editorialPosition: number;
  categoryIds: string[];
}

export interface PublicWritingCategory {
  categoryId: string;
  locale: PlatformLocale;
  slug: string;
  name: string;
  description: string | null;
}

export interface PublishedWritingListItem extends WritingPublicationSnapshot {
  publishedAt: Date;
  categories: PublicWritingCategory[];
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

  const snapshot = value as Omit<WritingPublicationSnapshot, 'version' | 'categoryIds'> & {
    version?: number;
    categoryIds?: unknown;
  };

  return {
    ...snapshot,
    version: 2,
    categoryIds: Array.isArray(snapshot.categoryIds)
      ? snapshot.categoryIds.filter(
          (categoryId): categoryId is string => typeof categoryId === 'string',
        )
      : [],
  };
}

async function publishedCategoryMap(
  db: Kysely<Database>,
  locale: PlatformLocale,
  categoryIds: string[],
): Promise<Map<string, CategoryPublicationSnapshot>> {
  if (categoryIds.length === 0) return new Map();

  const rows = await db
    .selectFrom('category_publications')
    .select(['category_id', 'snapshot'])
    .where('locale', '=', locale)
    .where('category_id', 'in', [...new Set(categoryIds)])
    .execute();

  return new Map(
    rows.map((row) => [
      row.category_id,
      parseCategoryPublicationSnapshot(row.snapshot),
    ]),
  );
}

function resolveCategories(
  categoryIds: string[],
  categoriesById: Map<string, CategoryPublicationSnapshot>,
): PublicWritingCategory[] {
  return categoryIds.flatMap((categoryId) => {
    const category = categoriesById.get(categoryId);
    if (category === undefined) return [];
    return [
      {
        categoryId: category.categoryId,
        locale: category.locale,
        slug: category.slug,
        name: category.name,
        description: category.description,
      },
    ];
  });
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

    const categoryRows = await transaction
      .selectFrom('writing_categories')
      .select('category_id')
      .where('writing_id', '=', input.writingId)
      .orderBy('position')
      .execute();

    const snapshot: WritingPublicationSnapshot = {
      version: 2,
      writingId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      kind: row.kind,
      editorialWeight: row.editorial_weight,
      editorialPosition: row.editorial_position,
      categoryIds: categoryRows.map((category) => category.category_id),
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

  const parsed = rows.map((row) => ({
    snapshot: parseSnapshot(row.snapshot),
    publishedAt: row.published_at,
  }));
  const categoriesById = await publishedCategoryMap(
    db,
    locale,
    parsed.flatMap((row) => row.snapshot.categoryIds),
  );

  return parsed
    .map(({ snapshot, publishedAt }) => ({
      ...snapshot,
      publishedAt,
      categories: resolveCategories(snapshot.categoryIds, categoriesById),
    }))
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.writingId.localeCompare(right.writingId),
    );
}

export async function listPublishedWritingsForCategory(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; categoryId: string },
): Promise<PublishedWritingListItem[]> {
  const writings = await listPublishedWritings(db, input.locale);
  return writings.filter((writing) =>
    writing.categoryIds.includes(input.categoryId),
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
  const categoriesById = await publishedCategoryMap(
    db,
    input.locale,
    snapshot.categoryIds,
  );
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
    categories: resolveCategories(snapshot.categoryIds, categoriesById),
    alternate:
      alternate === undefined
        ? null
        : { locale: alternate.locale, slug: alternate.slug },
  };
}
