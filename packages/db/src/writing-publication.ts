import {
  parseWritingDocument,
  writingDocumentFromPlainText,
  type PlatformLocale,
  type WritingDocument,
  type WritingEditorialWeight,
  type WritingKind,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import {
  parseCategoryPublicationSnapshot,
  type CategoryPublicationSnapshot,
} from './category-publication.js';
import {
  parseTagPublicationSnapshot,
  type TagPublicationSnapshot,
} from './tag-publication.js';
import {
  listPublishedSystemReferences,
  type PublicSystemReference,
} from './system-reference.js';
import type { Database } from './schema.js';

export interface WritingPublicationSnapshot {
  version: 4;
  writingId: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  document: WritingDocument;
  kind: WritingKind;
  editorialWeight: WritingEditorialWeight;
  editorialPosition: number;
  categoryIds: string[];
  tagIds: string[];
  systemIds: string[];
}

export interface PublicWritingCategory {
  categoryId: string;
  locale: PlatformLocale;
  slug: string;
  name: string;
  description: string | null;
}

export interface PublicWritingTag {
  tagId: string;
  canonicalKey: string;
  locale: PlatformLocale;
  slug: string;
  name: string;
}

export interface PublishedWritingListItem extends WritingPublicationSnapshot {
  publishedAt: Date;
  categories: PublicWritingCategory[];
  tags: PublicWritingTag[];
  systems: PublicSystemReference[];
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

  const snapshot = value as Omit<
    WritingPublicationSnapshot,
    'version' | 'document' | 'categoryIds' | 'tagIds' | 'systemIds'
  > & {
    version?: number;
    document?: unknown;
    categoryIds?: unknown;
    tagIds?: unknown;
    systemIds?: unknown;
  };
  const document =
    parseWritingDocument(snapshot.document) ??
    writingDocumentFromPlainText(snapshot.body);

  return {
    ...snapshot,
    version: 4,
    document,
    categoryIds: Array.isArray(snapshot.categoryIds)
      ? snapshot.categoryIds.filter(
          (categoryId): categoryId is string => typeof categoryId === 'string',
        )
      : [],
    tagIds: Array.isArray(snapshot.tagIds)
      ? snapshot.tagIds.filter(
          (tagId): tagId is string => typeof tagId === 'string',
        )
      : [],
    systemIds: Array.isArray(snapshot.systemIds)
      ? snapshot.systemIds.filter(
          (systemId): systemId is string => typeof systemId === 'string',
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

async function publishedTagMap(
  db: Kysely<Database>,
  locale: PlatformLocale,
  tagIds: string[],
): Promise<Map<string, TagPublicationSnapshot>> {
  if (tagIds.length === 0) return new Map();

  const rows = await db
    .selectFrom('tag_publications')
    .select(['tag_id', 'snapshot'])
    .where('locale', '=', locale)
    .where('tag_id', 'in', [...new Set(tagIds)])
    .execute();

  return new Map(
    rows.map((row) => [row.tag_id, parseTagPublicationSnapshot(row.snapshot)]),
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

function resolveTags(
  tagIds: string[],
  tagsById: Map<string, TagPublicationSnapshot>,
): PublicWritingTag[] {
  return tagIds.flatMap((tagId) => {
    const tag = tagsById.get(tagId);
    if (tag === undefined) return [];
    return [
      {
        tagId: tag.tagId,
        canonicalKey: tag.canonicalKey,
        locale: tag.locale,
        slug: tag.slug,
        name: tag.name,
      },
    ];
  });
}

async function publishedSystemMap(
  db: Kysely<Database>,
  locale: PlatformLocale,
  systemIds: string[],
): Promise<Map<string, PublicSystemReference>> {
  const references = await listPublishedSystemReferences(db, {
    locale,
    ids: [...new Set(systemIds)],
  });
  return new Map(references.map((reference) => [reference.id, reference]));
}

function resolveSystems(
  systemIds: string[],
  systemsById: Map<string, PublicSystemReference>,
): PublicSystemReference[] {
  return systemIds.flatMap((systemId) => {
    const system = systemsById.get(systemId);
    return system === undefined ? [] : [system];
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
        'writing_localizations.editor_document',
      ])
      .where('writings.id', '=', input.writingId)
      .where('writing_localizations.locale', '=', input.locale)
      .executeTakeFirst();

    if (row === undefined) {
      throw new Error('Writing localization not found.');
    }

    const [categoryRows, tagRows, systemRows] = await Promise.all([
      transaction
        .selectFrom('writing_categories')
        .select('category_id')
        .where('writing_id', '=', input.writingId)
        .orderBy('position')
        .execute(),
      transaction
        .selectFrom('writing_tags')
        .select('tag_id')
        .where('writing_id', '=', input.writingId)
        .orderBy('position')
        .execute(),
      transaction
        .selectFrom('writing_systems')
        .select('system_id')
        .where('writing_id', '=', input.writingId)
        .orderBy('position')
        .execute(),
    ]);

    const snapshot: WritingPublicationSnapshot = {
      version: 4,
      writingId: row.id,
      locale: input.locale,
      slug: requiredText(row.slug, 'slug'),
      title: requiredText(row.title, 'title'),
      summary: requiredText(row.summary, 'summary'),
      body: row.body?.trim() || null,
      document:
        parseWritingDocument(row.editor_document) ??
        writingDocumentFromPlainText(row.body),
      kind: row.kind,
      editorialWeight: row.editorial_weight,
      editorialPosition: row.editorial_position,
      categoryIds: categoryRows.map((category) => category.category_id),
      tagIds: tagRows.map((tag) => tag.tag_id),
      systemIds: systemRows.map((system) => system.system_id),
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
  const [categoriesById, tagsById, systemsById] = await Promise.all([
    publishedCategoryMap(
      db,
      locale,
      parsed.flatMap((row) => row.snapshot.categoryIds),
    ),
    publishedTagMap(
      db,
      locale,
      parsed.flatMap((row) => row.snapshot.tagIds),
    ),
    publishedSystemMap(
      db,
      locale,
      parsed.flatMap((row) => row.snapshot.systemIds),
    ),
  ]);

  return parsed
    .map(({ snapshot, publishedAt }) => ({
      ...snapshot,
      publishedAt,
      categories: resolveCategories(snapshot.categoryIds, categoriesById),
      tags: resolveTags(snapshot.tagIds, tagsById),
      systems: resolveSystems(snapshot.systemIds, systemsById),
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
  const category = await db
    .selectFrom('category_publications')
    .select('category_id')
    .where('category_id', '=', input.categoryId)
    .where('locale', '=', input.locale)
    .executeTakeFirst();

  if (category === undefined) return [];

  const writings = await listPublishedWritings(db, input.locale);
  return writings.filter((writing) =>
    writing.categoryIds.includes(input.categoryId),
  );
}

export async function listPublishedWritingsForTag(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; tagId: string },
): Promise<PublishedWritingListItem[]> {
  const tag = await db
    .selectFrom('tag_publications')
    .select('tag_id')
    .where('tag_id', '=', input.tagId)
    .where('locale', '=', input.locale)
    .executeTakeFirst();

  if (tag === undefined) return [];

  const writings = await listPublishedWritings(db, input.locale);
  return writings.filter((writing) => writing.tagIds.includes(input.tagId));
}

export async function listPublishedWritingsForSystem(
  db: Kysely<Database>,
  input: { locale: PlatformLocale; systemId: string },
): Promise<PublishedWritingListItem[]> {
  const system = await db
    .selectFrom('system_publications')
    .select('system_id')
    .where('system_id', '=', input.systemId)
    .where('locale', '=', input.locale)
    .executeTakeFirst();

  if (system === undefined) return [];

  const writings = await listPublishedWritings(db, input.locale);
  return writings.filter((writing) => writing.systemIds.includes(input.systemId));
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
  const [categoriesById, tagsById, systemsById] = await Promise.all([
    publishedCategoryMap(db, input.locale, snapshot.categoryIds),
    publishedTagMap(db, input.locale, snapshot.tagIds),
    publishedSystemMap(db, input.locale, snapshot.systemIds),
  ]);
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
    tags: resolveTags(snapshot.tagIds, tagsById),
    systems: resolveSystems(snapshot.systemIds, systemsById),
    alternate:
      alternate === undefined
        ? null
        : { locale: alternate.locale, slug: alternate.slug },
  };
}
