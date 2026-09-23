import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { publishWritingLocalization } from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writingId = randomUUID();

try {
  const positionRow = await db
    .selectFrom('writings')
    .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
    .executeTakeFirst();
  const editorialPosition = (positionRow?.max_position ?? -1) + 1;

  const editorDocument = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'First Tiptap paragraph.' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Second Tiptap paragraph.' }],
      },
    ],
  };

  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'article',
      editorial_weight: 'normal',
      editorial_position: editorialPosition,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values({
      writing_id: writingId,
      locale: 'en',
      slug: 'aks-105-tiptap-editor',
      title: 'AKS-105 Tiptap Editor',
      summary: 'Qualification draft for the headless Writing editor.',
      body: 'First Tiptap paragraph.\n\nSecond Tiptap paragraph.',
      editor_document:
        editorDocument as unknown as Record<string, unknown>,
    })
    .execute();

  const draft = await db
    .selectFrom('writing_localizations')
    .select(['body', 'editor_document'])
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.deepEqual(draft.editor_document, editorDocument);
  assert.equal(
    draft.body,
    'First Tiptap paragraph.\n\nSecond Tiptap paragraph.',
  );

  await publishWritingLocalization(db, { writingId, locale: 'en' });

  const publication = await db
    .selectFrom('writing_publications')
    .select('snapshot')
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.equal(
    publication.snapshot.body,
    'First Tiptap paragraph.\n\nSecond Tiptap paragraph.',
    'AKS-105 must keep the existing controlled public paragraph projection.',
  );
  assert.equal(
    'editorDocument' in publication.snapshot ||
      'editor_document' in publication.snapshot,
    false,
    'The draft Tiptap payload must not become an unversioned public content schema before AKS-106.',
  );

  await assert.rejects(
    sql`
      update writing_localizations
      set editor_document = '[]'::jsonb
      where writing_id = ${writingId}::uuid
        and locale = 'en'
    `.execute(db),
    'The database must reject a non-document JSON payload.',
  );

  process.stdout.write(
    'AKS-105 Tiptap editor persistence qualification passed: structured draft JSON persists, invalid top-level payloads are rejected, and publication remains on the controlled plain-text projection until AKS-106.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db.destroy();
}
