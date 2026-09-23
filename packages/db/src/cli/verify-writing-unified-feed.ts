import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  listPublishedWritings,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writings = [
  {
    id: randomUUID(),
    kind: 'note' as const,
    position: 901,
    slug: 'aks-110-note',
    title: 'AKS-110 Note',
  },
  {
    id: randomUUID(),
    kind: 'article' as const,
    position: 902,
    slug: 'aks-110-article',
    title: 'AKS-110 Article',
  },
  {
    id: randomUUID(),
    kind: 'essay' as const,
    position: 903,
    slug: 'aks-110-essay',
    title: 'AKS-110 Essay',
  },
];

try {
  for (const writing of writings) {
    await db
      .insertInto('writings')
      .values({
        id: writing.id,
        kind: writing.kind,
        editorial_weight:
          writing.kind === 'essay'
            ? 'major'
            : writing.kind === 'article'
              ? 'featured'
              : 'normal',
        editorial_position: writing.position,
      })
      .execute();

    await db
      .insertInto('writing_localizations')
      .values({
        writing_id: writing.id,
        locale: 'en',
        slug: writing.slug,
        title: writing.title,
        summary: `${writing.title} summary.`,
        body: `${writing.title} body.`,
      })
      .execute();

    await publishWritingLocalization(db, {
      writingId: writing.id,
      locale: 'en',
    });
  }

  const published = await listPublishedWritings(db, 'en');
  const qualified = published.filter((candidate) =>
    writings.some((writing) => writing.id === candidate.writingId),
  );

  assert.deepEqual(
    qualified.map((writing) => writing.kind),
    ['note', 'article', 'essay'],
    'All three native forms must coexist in the same ordered Writing read model.',
  );
  assert.deepEqual(
    qualified.map((writing) => writing.title),
    ['AKS-110 Note', 'AKS-110 Article', 'AKS-110 Essay'],
  );
  assert.deepEqual(
    qualified.map((writing) => writing.editorialPosition),
    [901, 902, 903],
    'Unified feed ordering must continue to use the code-defined editorial order.',
  );

  process.stdout.write(
    'AKS-110 unified editorial surface qualification passed: Note, Article, and Essay coexist in one published read model and preserve editorial order without separate kind feeds.\n',
  );
} finally {
  await db
    .deleteFrom('writings')
    .where('id', 'in', writings.map((writing) => writing.id))
    .execute();
  await db.destroy();
}
