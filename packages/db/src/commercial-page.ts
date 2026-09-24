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
