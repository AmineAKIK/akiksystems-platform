import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface CategoryPublicationSnapshot {
  version: 1;
  categoryId: string;
  locale: PlatformLocale;
  slug: string;
  name: string;
  description: string | null;
  editorialPosition: number;
}

export interface PublishedCategory extends CategoryPublicationSnapshot {
  publishedAt: Date;
  alternate: { locale: PlatformLocale; slug: string } | null;
}

function requiredText(value: string | null, label: string): string {
  const normalized = value?.trim() ?? '';
  if (normalized === '') {
    throw new Error(`Category ${label} is required before publication.`);
  }
  return normalized;
}

export function parseCategoryPublicationSnapshot(
  value: unknown,
): CategoryPublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Category publication snapshot.');
  }
  return value as CategoryPublicationSnapshot;
}

export async function publishCategoryLocalization(
  db: Kysely<Database>,
  input: { categoryId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    const row = await transaction
      .selectFrom('categories')
      .innerJoin(
        'category_localizations',
        'category_localizations.category_id',
        'categories.id',
      )
      .select([
        'categories.id',
        'categories.editorial_position',
        'category_localizations.slug',
        'category_localizations.name',
        'category_localizations.description',
      ])
      .where('categories.id', '=', input.categoryId)
      .where('category_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) {
      throw new Error('Category localization not found.');
    }

    const snapshot: CategoryPublicationSnapshot = {
      version: 1,
      categoryId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      name: requiredText(row.name, 'name'),
      description: row.description?.trim() || null,
      editorialPosition: row.editorial_position,
    };
    const now = new Date();
    const snapshotJson = snapshot as unknown as Record<string, unknown>;

    await transaction
      .insertInto('category_publications')
      .values({
        category_id: input.categoryId,
        locale: input.locale,
        slug: snapshot.slug,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['category_id', 'locale']).doUpdateSet({
          slug: snapshot.slug,
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('category_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('category_id', '=', input.categoryId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function unpublishCategoryLocalization(
  db: Kysely<Database>,
  input: { categoryId: string; locale: PlatformLocale },
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('category_publications')
      .where('category_id', '=', input.categoryId)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('category_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('category_id', '=', input.categoryId)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function listPublishedCategories(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<Array<CategoryPublicationSnapshot & { publishedAt: Date }>> {
  const rows = await db
    .selectFrom('category_publications')
    .select(['snapshot', 'published_at'])
    .where('locale', '=', locale)
    .execute();

  return rows
    .map((row) => ({
      ...parseCategoryPublicationSnapshot(row.snapshot),
      publishedAt: row.published_at,
    }))
    .sort(
      (left, right) =>
        left.editorialPosition - right.editorialPosition ||
        left.categoryId.localeCompare(right.categoryId),
    );
}

export async function getPublishedCategory(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; slug: string },
): Promise<PublishedCategory | null> {
  const row = await db
    .selectFrom('category_publications')
    .select(['category_id', 'snapshot', 'published_at'])
    .where('locale', '=', input.locale)
    .where('slug', '=', input.slug)
    .executeTakeFirst();

  if (row === undefined) return null;

  const snapshot = parseCategoryPublicationSnapshot(row.snapshot);
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db
    .selectFrom('category_publications')
    .select(['locale', 'slug'])
    .where('category_id', '=', row.category_id)
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
