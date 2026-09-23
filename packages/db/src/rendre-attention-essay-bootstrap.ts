import { randomUUID } from 'node:crypto';

import { writingDocumentToPlainText } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import { rendreAttentionEssayDocument } from './rendre-attention-essay-document.js';
import type { Database } from './schema.js';
import { publishWritingLocalization } from './writing-publication.js';

export interface BootstrapRendreAttentionEssayResult {
  created: boolean;
  writingId: string;
  linkedSystemId: string | null;
}

const frenchSlug = 'rendre-l-attention-au-reel';
const originalPublishedAt = new Date('2026-09-16T10:25:02.000Z');

export async function bootstrapRendreAttentionEssay(
  db: Kysely<Database>,
): Promise<BootstrapRendreAttentionEssayResult> {
  const existing = await db
    .selectFrom('writing_localizations')
    .select(['writing_id', 'editorial_state'])
    .where('locale', '=', 'fr')
    .where('slug', '=', frenchSlug)
    .executeTakeFirst();

  let writingId = existing?.writing_id ?? randomUUID();
  let created = false;
  let editorialState = existing?.editorial_state ?? 'draft';

  if (existing === undefined) {
    const position = await db
      .selectFrom('writings')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst();

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('writings')
        .values({
          id: writingId,
          kind: 'essay',
          editorial_weight: 'major',
          editorial_position: (position?.max_position ?? -1) + 1,
        })
        .execute();

      await transaction
        .insertInto('writing_localizations')
        .values({
          writing_id: writingId,
          locale: 'fr',
          slug: frenchSlug,
          title: 'Rendre l’attention au réel',
          summary:
            'De l’expérience du terrain à ProtoCap et Céline : concevoir des systèmes qui préservent l’attention et développent la capacité d’agir.',
          body: writingDocumentToPlainText(rendreAttentionEssayDocument),
          editor_document:
            rendreAttentionEssayDocument as unknown as Record<string, unknown>,
        })
        .execute();
    });

    created = true;
    editorialState = 'draft';
  }

  const protoCap = await db
    .selectFrom('system_localizations')
    .select('system_id')
    .where('locale', '=', 'fr')
    .where('slug', '=', 'protocap')
    .executeTakeFirst();

  let relationAdded = false;
  if (protoCap !== undefined) {
    const existingRelation = await db
      .selectFrom('writing_systems')
      .select('system_id')
      .where('writing_id', '=', writingId)
      .where('system_id', '=', protoCap.system_id)
      .executeTakeFirst();

    if (existingRelation === undefined) {
      await db
        .insertInto('writing_systems')
        .values({
          writing_id: writingId,
          system_id: protoCap.system_id,
          position: 0,
        })
        .execute();
      relationAdded = true;
    }
  }

  if (created || relationAdded || editorialState !== 'published') {
    await publishWritingLocalization(db, { writingId, locale: 'fr' });

    await db
      .updateTable('writing_localizations')
      .set({ published_at: originalPublishedAt })
      .where('writing_id', '=', writingId)
      .where('locale', '=', 'fr')
      .execute();

    await db
      .updateTable('writing_publications')
      .set({ published_at: originalPublishedAt })
      .where('writing_id', '=', writingId)
      .where('locale', '=', 'fr')
      .execute();
  }

  return {
    created,
    writingId,
    linkedSystemId: protoCap?.system_id ?? null,
  };
}
