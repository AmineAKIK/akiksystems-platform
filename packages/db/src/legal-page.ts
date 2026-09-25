import {
  parseWritingDocument,
  writingDocumentExcerpt,
  writingDocumentToPlainText,
  isLegalPageKey,
  legalPageKeys,
  type LegalPageKey,
  type PlatformLocale,
  type WritingDocument,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export { isLegalPageKey, legalPageKeys } from '@akiksystems/core';
export type { LegalPageKey } from '@akiksystems/core';

export interface LegalPagePublicationSnapshot {
  version: 1;
  pageId: string;
  pageKey: LegalPageKey;
  locale: PlatformLocale;
  title: string;
  document: WritingDocument;
}

export interface PublishedLegalPage extends LegalPagePublicationSnapshot {
  publishedAt: Date;
}

export function parseLegalPageDraftDocument(
  value: unknown,
): WritingDocument | null {
  const document = parseWritingDocument(value);
  if (document === null) return null;

  if (
    document.content.some(
      (block) =>
        block.type === 'image' ||
        block.type === 'gallery' ||
        block.type === 'codeBlock',
    )
  ) {
    return null;
  }

  return document;
}

export function parseLegalPagePublicationSnapshot(
  value: unknown,
): LegalPagePublicationSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid legal-page publication snapshot.');
  }

  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.pageId !== 'string' ||
    typeof record.pageKey !== 'string' ||
    !isLegalPageKey(record.pageKey) ||
    (record.locale !== 'en' && record.locale !== 'fr') ||
    typeof record.title !== 'string' ||
    record.title.trim() === ''
  ) {
    throw new Error('Invalid legal-page publication snapshot.');
  }

  const document = parseLegalPageDraftDocument(record.document);
  if (
    document === null ||
    writingDocumentToPlainText(document).trim() === ''
  ) {
    throw new Error('Invalid legal-page publication snapshot.');
  }

  return {
    version: 1,
    pageId: record.pageId,
    pageKey: record.pageKey,
    locale: record.locale,
    title: record.title,
    document,
  };
}

export async function publishLegalPageLocalization(
  db: Kysely<Database>,
  input: { pageKey: LegalPageKey; locale: PlatformLocale },
): Promise<LegalPagePublicationSnapshot> {
  const row = await db
    .selectFrom('legal_pages')
    .innerJoin(
      'legal_page_localizations',
      'legal_page_localizations.page_id',
      'legal_pages.id',
    )
    .select([
      'legal_pages.id',
      'legal_pages.page_key',
      'legal_page_localizations.title',
      'legal_page_localizations.editor_document',
    ])
    .where('legal_pages.page_key', '=', input.pageKey)
    .where('legal_page_localizations.locale', '=', input.locale)
    .executeTakeFirst();

  if (row === undefined) {
    throw new Error('Legal page localization not found.');
  }

  const title = row.title?.trim() ?? '';
  if (title === '') {
    throw new Error('Legal page title is required before publication.');
  }

  const document = parseLegalPageDraftDocument(row.editor_document);
  if (document === null || writingDocumentToPlainText(document).trim() === '') {
    throw new Error(
      'Legal page body is required and must use the controlled editorial schema before publication.',
    );
  }

  const snapshot: LegalPagePublicationSnapshot = {
    version: 1,
    pageId: row.id,
    pageKey: input.pageKey,
    locale: input.locale,
    title,
    document,
  };
  const now = new Date();

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('legal_page_publications')
      .values({
        page_id: row.id,
        locale: input.locale,
        snapshot: snapshot as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      })
      .onConflict((conflict) =>
        conflict.columns(['page_id', 'locale']).doUpdateSet({
          snapshot: snapshot as unknown as Record<string, unknown>,
          published_at: now,
          updated_at: now,
        }),
      )
      .execute();

    await transaction
      .updateTable('legal_page_localizations')
      .set({
        editorial_state: 'published',
        published_at: now,
        updated_at: now,
      })
      .where('page_id', '=', row.id)
      .where('locale', '=', input.locale)
      .execute();
  });

  return snapshot;
}

export async function unpublishLegalPageLocalization(
  db: Kysely<Database>,
  input: { pageKey: LegalPageKey; locale: PlatformLocale },
): Promise<void> {
  const page = await db
    .selectFrom('legal_pages')
    .select('id')
    .where('page_key', '=', input.pageKey)
    .executeTakeFirst();

  if (page === undefined) {
    throw new Error('Legal page not found.');
  }

  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('legal_page_publications')
      .where('page_id', '=', page.id)
      .where('locale', '=', input.locale)
      .execute();

    await transaction
      .updateTable('legal_page_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('page_id', '=', page.id)
      .where('locale', '=', input.locale)
      .execute();
  });
}

export async function getPublishedLegalPage(
  db: Kysely<Database>,
  input: { pageKey: LegalPageKey; locale: PlatformLocale },
): Promise<PublishedLegalPage | null> {
  const row = await db
    .selectFrom('legal_pages')
    .innerJoin(
      'legal_page_publications',
      'legal_page_publications.page_id',
      'legal_pages.id',
    )
    .select([
      'legal_page_publications.snapshot',
      'legal_page_publications.published_at',
    ])
    .where('legal_pages.page_key', '=', input.pageKey)
    .where('legal_page_publications.locale', '=', input.locale)
    .executeTakeFirst();

  if (row === undefined) return null;

  return {
    ...parseLegalPagePublicationSnapshot(row.snapshot),
    publishedAt: row.published_at,
  };
}

export async function listPublishedLegalPageKeys(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<LegalPageKey[]> {
  const rows = await db
    .selectFrom('legal_pages')
    .innerJoin(
      'legal_page_publications',
      'legal_page_publications.page_id',
      'legal_pages.id',
    )
    .select('legal_pages.page_key')
    .where('legal_page_publications.locale', '=', locale)
    .execute();

  const published = new Set(
    rows.flatMap(({ page_key }) => (isLegalPageKey(page_key) ? [page_key] : [])),
  );

  return legalPageKeys.filter((pageKey) => published.has(pageKey));
}

export function legalPageDescription(
  page: LegalPagePublicationSnapshot,
): string {
  return writingDocumentExcerpt(page.document, 180);
}
