import assert from 'node:assert/strict';

import { writingDocumentToPlainText } from '@akiksystems/core';

import { bootstrapRendreAttentionEssay } from '../rendre-attention-essay-bootstrap.js';
import { rendreAttentionEssayDocument } from '../rendre-attention-essay-document.js';
import { createDatabase } from '../database.js';
import {
  getPublishedWriting,
  listPublishedWritings,
} from '../writing-publication.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const first = await bootstrapRendreAttentionEssay(db);
  const second = await bootstrapRendreAttentionEssay(db);

  assert.equal(second.created, false);
  assert.equal(second.writingId, first.writingId);

  const writing = await getPublishedWriting(db, {
    locale: 'fr',
    slug: 'rendre-l-attention-au-reel',
  });

  assert.ok(writing);
  assert.equal(writing.kind, 'essay');
  assert.equal(writing.editorialWeight, 'major');
  assert.equal(writing.title, 'Rendre l’attention au réel');
  assert.equal(writing.alternate, null);
  assert.equal(writing.publishedAt.toISOString(), '2026-09-16T10:25:02.000Z');
  assert.ok(writing.document.content.length >= 200);
  assert.ok(
    writingDocumentToPlainText(writing.document).includes(
      'Elles consommaient de l’attention, et cette différence change presque tout.',
    ),
  );
  assert.ok(
    writingDocumentToPlainText(writing.document).includes(
      'l’attention peut retourner là où tout avait commencé : dans le réel.',
    ),
  );
  assert.ok(
    writingDocumentToPlainText(rendreAttentionEssayDocument).includes(
      'ProtoCap : matérialiser des hypothèses',
    ),
  );

  const frenchFeed = await listPublishedWritings(db, 'fr');
  assert.ok(
    frenchFeed.some(
      (item) =>
        item.writingId === first.writingId &&
        item.kind === 'essay' &&
        item.editorialWeight === 'major',
    ),
  );

  const englishFeed = await listPublishedWritings(db, 'en');
  assert.equal(
    englishFeed.some((item) => item.writingId === first.writingId),
    false,
    'The original French essay must not silently fabricate an English publication.',
  );

  process.stdout.write(
    'AKS-113 qualification passed: the canonical 25-page French essay is published as a native ESSAY/MAJOR Writing, keeps its original publication date, preserves the real long-form content, and does not invent an English localization.\n',
  );
} finally {
  await db.destroy();
}
