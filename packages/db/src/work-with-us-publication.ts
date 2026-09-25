import {
  parseWorkWithUsContent,
  type PlatformLocale,
  type WorkWithUsEditableContent,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface WorkWithUsPublicationSnapshot
  extends Omit<WorkWithUsEditableContent, 'hero'> {
  version: 2;
  pageId: string;
  locale: PlatformLocale;
  hero: {
    eyebrow: string | null;
    title: string;
    introduction: string;
  };
}

export type PublishedWorkWithUsPage = WorkWithUsPublicationSnapshot;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseWorkWithUsPublicationSnapshot(
  value: unknown,
): WorkWithUsPublicationSnapshot | null {
  const root = record(value);
  if (
    root === null ||
    root.version !== 2 ||
    typeof root.pageId !== 'string' ||
    (root.locale !== 'en' && root.locale !== 'fr')
  ) {
    return null;
  }

  const content = parseWorkWithUsContent(root);
  if (content.hero.title === null || content.hero.introduction === null) {
    return null;
  }

  return {
    version: 2,
    pageId: root.pageId,
    locale: root.locale,
    ...content,
    hero: {
      eyebrow: content.hero.eyebrow,
      title: content.hero.title,
      introduction: content.hero.introduction,
    },
  };
}

export async function buildWorkWithUsPublicationSnapshot(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<WorkWithUsPublicationSnapshot> {
  const row = await db
    .selectFrom('work_with_us_localizations')
    .select('content')
    .where('page_id', '=', pageId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  const content = parseWorkWithUsContent(row?.content);
  if (content.hero.title === null || content.hero.introduction === null) {
    throw new Error(
      `Work with us ${locale.toUpperCase()} requires a hero title and introduction before publication.`,
    );
  }

  return {
    version: 2,
    pageId,
    locale,
    ...content,
    hero: {
      eyebrow: content.hero.eyebrow,
      title: content.hero.title,
      introduction: content.hero.introduction,
    },
  };
}

export async function publishWorkWithUsLocalization(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<WorkWithUsPublicationSnapshot> {
  const snapshot = await buildWorkWithUsPublicationSnapshot(db, pageId, locale);
  const snapshotJson = snapshot as unknown as Record<string, unknown>;
  const now = new Date();

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('work_with_us_publications')
      .values({
        page_id: pageId,
        locale,
        snapshot: snapshotJson,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['page_id', 'locale']).doUpdateSet({
          snapshot: snapshotJson,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('work_with_us_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', pageId)
      .where('locale', '=', locale)
      .execute();
  });

  return snapshot;
}

export async function getPublishedWorkWithUsPage(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedWorkWithUsPage | null> {
  const publication = await db
    .selectFrom('work_with_us_publications')
    .select('snapshot')
    .where('locale', '=', locale)
    .executeTakeFirst();

  return publication === undefined
    ? null
    : parseWorkWithUsPublicationSnapshot(publication.snapshot);
}
