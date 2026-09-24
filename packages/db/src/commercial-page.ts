import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface CommercialPagePublicationSnapshot {
  version: 1;
  pageId: string;
  locale: PlatformLocale;
  title: string;
  introduction: string;
  situationsTitle: string | null;
  situationsBody: string | null;
  capabilitiesTitle: string | null;
  capabilitiesBody: string | null;
  collaborationTitle: string | null;
  collaborationBody: string | null;
  inquiryTitle: string | null;
  inquiryBody: string | null;
  privacyNote: string | null;
}

export type PublishedCommercialPage = CommercialPagePublicationSnapshot;

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function parseCommercialPagePublicationSnapshot(
  value: unknown,
): CommercialPagePublicationSnapshot | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.pageId !== 'string' ||
    (record.locale !== 'en' && record.locale !== 'fr') ||
    typeof record.title !== 'string' ||
    record.title.trim() === '' ||
    typeof record.introduction !== 'string' ||
    record.introduction.trim() === ''
  ) {
    return null;
  }

  return {
    version: 1,
    pageId: record.pageId,
    locale: record.locale,
    title: record.title,
    introduction: record.introduction,
    situationsTitle: nullableString(record.situationsTitle),
    situationsBody: nullableString(record.situationsBody),
    capabilitiesTitle: nullableString(record.capabilitiesTitle),
    capabilitiesBody: nullableString(record.capabilitiesBody),
    collaborationTitle: nullableString(record.collaborationTitle),
    collaborationBody: nullableString(record.collaborationBody),
    inquiryTitle: nullableString(record.inquiryTitle),
    inquiryBody: nullableString(record.inquiryBody),
    privacyNote: nullableString(record.privacyNote),
  };
}

export async function buildCommercialPagePublicationSnapshot(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<CommercialPagePublicationSnapshot> {
  const row = await db
    .selectFrom('work_with_us_localizations')
    .select([
      'title',
      'introduction',
      'situations_title',
      'situations_body',
      'capabilities_title',
      'capabilities_body',
      'collaboration_title',
      'collaboration_body',
      'inquiry_title',
      'inquiry_body',
      'privacy_note',
    ])
    .where('page_id', '=', pageId)
    .where('locale', '=', locale)
    .executeTakeFirst();

  if (
    row === undefined ||
    row.title === null ||
    row.title.trim() === '' ||
    row.introduction === null ||
    row.introduction.trim() === ''
  ) {
    throw new Error(
      `Commercial page ${locale.toUpperCase()} requires a title and introduction before publication.`,
    );
  }

  return {
    version: 1,
    pageId,
    locale,
    title: row.title,
    introduction: row.introduction,
    situationsTitle: row.situations_title,
    situationsBody: row.situations_body,
    capabilitiesTitle: row.capabilities_title,
    capabilitiesBody: row.capabilities_body,
    collaborationTitle: row.collaboration_title,
    collaborationBody: row.collaboration_body,
    inquiryTitle: row.inquiry_title,
    inquiryBody: row.inquiry_body,
    privacyNote: row.privacy_note,
  };
}

export async function publishCommercialPageLocalization(
  db: Kysely<Database>,
  pageId: string,
  locale: PlatformLocale,
): Promise<CommercialPagePublicationSnapshot> {
  const snapshot = await buildCommercialPagePublicationSnapshot(
    db,
    pageId,
    locale,
  );
  const now = new Date();

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('work_with_us_publications')
      .values({
        page_id: pageId,
        locale,
        snapshot,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['page_id', 'locale']).doUpdateSet({
          snapshot,
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

export async function getPublishedCommercialPage(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublishedCommercialPage | null> {
  const publication = await db
    .selectFrom('work_with_us_publications')
    .select('snapshot')
    .where('locale', '=', locale)
    .executeTakeFirst();

  return publication === undefined
    ? null
    : parseCommercialPagePublicationSnapshot(publication.snapshot);
}
