import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { writingDocumentFromPlainText } from '@akiksystems/core';

import { createDatabase } from '../database.js';
import {
  getPublishedWriting,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writingId = randomUUID();

try {
  const body =
    'A Note starts from one concrete observation.\n\nIt should not require a separate long-form summary or layout structure.';
  const document = writingDocumentFromPlainText(body);

  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'note',
      editorial_weight: 'normal',
      editorial_position: 914,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values({
      writing_id: writingId,
      locale: 'en',
      slug: 'lightweight-note',
      title: 'A lightweight Note',
      summary: null,
      body,
      editor_document: document as unknown as Record<string, unknown>,
    })
    .execute();

  await publishWritingLocalization(db, { writingId, locale: 'en' });

  const published = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'lightweight-note',
  });
  assert.ok(published);
  assert.equal(published.kind, 'note');
  assert.equal(published.editorialWeight, 'normal');
  assert.equal(published.summary, body.replace(/\n\n/g, ' '));
  assert.equal(published.document.content.length, 2);
  assert.ok(
    published.document.content.every((block) => block.type === 'paragraph'),
  );

  await db
    .updateTable('writing_localizations')
    .set({
      body: 'Heading plus paragraph.',
      editor_document: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Long-form structure' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Paragraph.' }],
          },
        ],
      },
      updated_at: new Date(),
    })
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .execute();

  await assert.rejects(
    publishWritingLocalization(db, { writingId, locale: 'en' }),
    /lightweight paragraph-only editor/,
  );

  await db
    .updateTable('writing_localizations')
    .set({
      body: null,
      editor_document: writingDocumentFromPlainText(
        '',
      ) as unknown as Record<string, unknown>,
      updated_at: new Date(),
    })
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .execute();

  await assert.rejects(
    publishWritingLocalization(db, { writingId, locale: 'en' }),
    /Note content is required/,
  );

  process.stdout.write(
    'AKS-114 lightweight Note qualification passed: Notes publish from title + paragraph-only body without an authored summary, derive their feed excerpt, and reject empty or long-form structured content.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db.destroy();
}
