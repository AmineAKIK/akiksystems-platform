import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import {
  publishWritingLocalization,
  searchPublishedWritings,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const titleMatch = randomUUID();
const bodyMatch = randomUUID();
const draftOnly = randomUUID();
const frenchMatch = randomUUID();
const ids = [titleMatch, bodyMatch, draftOnly, frenchMatch];

async function createWriting(input: {
  id: string;
  locale: 'en' | 'fr';
  slug: string;
  title: string;
  summary: string;
  body: string;
  position: number;
  publish?: boolean;
}) {
  await db
    .insertInto('writings')
    .values({
      id: input.id,
      kind: 'article',
      editorial_weight: 'normal',
      editorial_position: input.position,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values({
      writing_id: input.id,
      locale: input.locale,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body: input.body,
    })
    .execute();

  if (input.publish !== false) {
    await publishWritingLocalization(db, {
      writingId: input.id,
      locale: input.locale,
    });
  }
}

try {
  const column = await sql<{
    is_generated: string;
    data_type: string;
  }>`
    select is_generated, data_type
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'writing_publications'
      and column_name = 'search_vector'
  `.execute(db);
  assert.equal(column.rows.length, 1);
  assert.equal(column.rows[0]?.is_generated, 'ALWAYS');
  assert.equal(column.rows[0]?.data_type, 'tsvector');

  const indexes = await sql<{ indexdef: string }>`
    select indexdef
    from pg_indexes
    where schemaname = current_schema()
      and tablename = 'writing_publications'
      and indexname = 'writing_publications_search_vector_gin_idx'
  `.execute(db);
  assert.equal(indexes.rows.length, 1);
  assert.match(indexes.rows[0]?.indexdef ?? '', /using gin \(search_vector\)/i);

  await createWriting({
    id: titleMatch,
    locale: 'en',
    slug: 'postgresql-search-architecture',
    title: 'PostgreSQL search architecture',
    summary: 'A title-ranked full-text result.',
    body: 'The body talks about delivery and publication snapshots.',
    position: 1161,
  });
  await createWriting({
    id: bodyMatch,
    locale: 'en',
    slug: 'quiet-index',
    title: 'A quiet publication index',
    summary: 'A body-ranked full-text result.',
    body: 'PostgreSQL search architecture appears here only in the body.',
    position: 1162,
  });
  await createWriting({
    id: draftOnly,
    locale: 'en',
    slug: 'draft-search-leak',
    title: 'PostgreSQL search architecture draft',
    summary: 'This draft must never be searchable.',
    body: 'Unpublished content stays outside the public index.',
    position: 1163,
    publish: false,
  });
  await createWriting({
    id: frenchMatch,
    locale: 'fr',
    slug: 'maitriser-les-systemes',
    title: 'Maîtriser les systèmes réels',
    summary: 'Une recherche française sur la maîtrise et les systèmes.',
    body: 'L’attention reste liée au réel et à la capacité d’agir.',
    position: 1164,
  });

  const english = await searchPublishedWritings(db, {
    locale: 'en',
    query: 'PostgreSQL search architecture',
  });
  const englishIds = english.map((writing) => writing.writingId);
  assert.equal(englishIds[0], titleMatch);
  assert.ok(englishIds.includes(bodyMatch));
  assert.equal(englishIds.includes(draftOnly), false);
  assert.equal(englishIds.includes(frenchMatch), false);

  const phrase = await searchPublishedWritings(db, {
    locale: 'en',
    query: '"publication index"',
  });
  assert.deepEqual(
    phrase
      .filter((writing) => ids.includes(writing.writingId))
      .map((writing) => writing.writingId),
    [bodyMatch],
  );

  const excluded = await searchPublishedWritings(db, {
    locale: 'en',
    query: 'PostgreSQL -architecture',
  });
  assert.equal(
    excluded.some((writing) => writing.writingId === titleMatch),
    false,
  );

  const french = await searchPublishedWritings(db, {
    locale: 'fr',
    query: 'maîtriser systèmes',
  });
  assert.equal(french[0]?.writingId, frenchMatch);
  assert.equal(
    french.some((writing) => writing.writingId === titleMatch),
    false,
  );

  await db
    .updateTable('writing_localizations')
    .set({
      body: 'The publication now contains the distinctive term observability.',
      updated_at: new Date(),
    })
    .where('writing_id', '=', bodyMatch)
    .where('locale', '=', 'en')
    .execute();
  await publishWritingLocalization(db, {
    writingId: bodyMatch,
    locale: 'en',
  });

  const refreshed = await searchPublishedWritings(db, {
    locale: 'en',
    query: 'observability',
  });
  assert.equal(refreshed[0]?.writingId, bodyMatch);

  await db
    .updateTable('writings')
    .set({
      lifecycle: 'archived',
      archived_at: new Date(),
      updated_at: new Date(),
    })
    .where('id', '=', titleMatch)
    .execute();

  const archived = await searchPublishedWritings(db, {
    locale: 'en',
    query: 'PostgreSQL search architecture',
  });
  assert.equal(
    archived.some((writing) => writing.writingId === titleMatch),
    false,
  );

  process.stdout.write(
    'AKS-116 qualification passed: published Writing snapshots are indexed by a locale-aware generated PostgreSQL tsvector with a GIN index; ranked search excludes drafts, archived Writings, and the other locale, supports web-search syntax, and refreshes automatically after republication.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', 'in', ids).execute();
  await db.destroy();
}
