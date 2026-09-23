import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedTag,
  listPublishedTags,
  publishTagLocalization,
  unpublishTagLocalization,
} from '../tag-publication.js';
import {
  getPublishedWriting,
  listPublishedWritingsForTag,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const tagA = randomUUID();
const tagB = randomUUID();
const writingA = randomUUID();
const writingB = randomUUID();

try {
  await db
    .insertInto('tags')
    .values([
      { id: tagA, canonical_key: 'software-architecture' },
      { id: tagB, canonical_key: 'delivery-practice' },
    ])
    .execute();

  await assert.rejects(
    db
      .insertInto('tags')
      .values({
        id: randomUUID(),
        canonical_key: 'software-architecture',
      })
      .execute(),
  );

  await assert.rejects(
    db
      .insertInto('tags')
      .values({
        id: randomUUID(),
        canonical_key: 'Not Valid',
      })
      .execute(),
  );

  await db
    .insertInto('tag_localizations')
    .values([
      {
        tag_id: tagA,
        locale: 'en',
        slug: 'software-architecture',
        name: 'Software architecture',
      },
      {
        tag_id: tagA,
        locale: 'fr',
        slug: 'architecture-logicielle',
        name: 'Architecture logicielle',
      },
      {
        tag_id: tagB,
        locale: 'en',
        slug: 'delivery-practice',
        name: 'Delivery practice',
      },
      {
        tag_id: tagB,
        locale: 'fr',
        slug: 'pratique-livraison',
        name: 'Pratique de livraison',
      },
    ])
    .execute();

  await db
    .insertInto('writings')
    .values([
      {
        id: writingA,
        kind: 'essay',
        editorial_weight: 'major',
        editorial_position: 0,
      },
      {
        id: writingB,
        kind: 'article',
        editorial_weight: 'normal',
        editorial_position: 1,
      },
    ])
    .execute();

  await db
    .insertInto('writing_localizations')
    .values([
      {
        writing_id: writingA,
        locale: 'en',
        slug: 'architecture-without-page-builders',
        title: 'Architecture Without Page Builders',
        summary: 'Code owns semantics while editorial data remains manageable.',
      },
      {
        writing_id: writingA,
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
        title: 'Architecture sans page builder',
        summary: 'Le code porte la sémantique tandis que les données restent administrables.',
      },
      {
        writing_id: writingB,
        locale: 'en',
        slug: 'shipping-small-systems',
        title: 'Shipping Small Systems',
        summary: 'A second Writing reusing the same canonical Tag.',
      },
      {
        writing_id: writingB,
        locale: 'fr',
        slug: 'livrer-petits-systemes',
        title: 'Livrer de petits systèmes',
        summary: 'Un second écrit réutilisant le même Tag canonique.',
      },
    ])
    .execute();

  await db
    .insertInto('writing_tags')
    .values([
      { writing_id: writingA, tag_id: tagA, position: 0 },
      { writing_id: writingA, tag_id: tagB, position: 1 },
      { writing_id: writingB, tag_id: tagA, position: 0 },
    ])
    .execute();

  await publishTagLocalization(db, { tagId: tagA, locale: 'en' });
  await publishTagLocalization(db, { tagId: tagA, locale: 'fr' });
  await publishTagLocalization(db, { tagId: tagB, locale: 'en' });

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });
  await publishWritingLocalization(db, { writingId: writingA, locale: 'fr' });
  await publishWritingLocalization(db, { writingId: writingB, locale: 'en' });

  const englishTags = await listPublishedTags(db, 'en');
  assert.deepEqual(
    englishTags.map((tag) => tag.canonicalKey).sort(),
    ['delivery-practice', 'software-architecture'],
  );
  assert.deepEqual(
    (await listPublishedTags(db, 'fr')).map((tag) => tag.canonicalKey),
    ['software-architecture'],
    'A missing FR Tag publication must not fall back to EN.',
  );

  const tag = await getPublishedTag(db, {
    locale: 'en',
    slug: 'software-architecture',
  });
  assert.equal(tag?.canonicalKey, 'software-architecture');
  assert.equal(tag?.alternate?.slug, 'architecture-logicielle');

  const englishWriting = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'architecture-without-page-builders',
  });
  assert.deepEqual(
    englishWriting?.tags.map((entry) => entry.name),
    ['Software architecture', 'Delivery practice'],
  );

  const frenchWriting = await getPublishedWriting(db, {
    locale: 'fr',
    slug: 'architecture-sans-page-builder',
  });
  assert.deepEqual(
    frenchWriting?.tags.map((entry) => entry.name),
    ['Architecture logicielle'],
    'FR must expose only Tags published in FR.',
  );

  const reused = await listPublishedWritingsForTag(db, {
    locale: 'en',
    tagId: tagA,
  });
  assert.deepEqual(
    reused.map((writing) => writing.writingId),
    [writingA, writingB],
    'One canonical Tag must be reusable across multiple Writings.',
  );

  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('writing_tags')
      .where('writing_id', '=', writingA)
      .where('tag_id', '=', tagA)
      .execute();

    await transaction
      .updateTable('writing_tags')
      .set({ position: 0 })
      .where('writing_id', '=', writingA)
      .where('tag_id', '=', tagB)
      .execute();

    await transaction
      .updateTable('writing_localizations')
      .set({
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('writing_id', '=', writingA)
      .execute();
  });

  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.tagIds,
    [tagA, tagB],
    'Draft Tag relation changes must not leak before Writing republication.',
  );

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.tagIds,
    [tagB],
  );
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
      })
    )?.tagIds,
    [tagA, tagB],
    'EN Writing republication must not mutate the FR snapshot.',
  );

  await db
    .updateTable('tag_localizations')
    .set({
      name: 'Draft delivery label',
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('tag_id', '=', tagB)
    .where('locale', '=', 'en')
    .execute();

  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.tags.map((entry) => entry.name),
    ['Delivery practice'],
    'Draft Tag copy must not leak into published Writings.',
  );

  await publishTagLocalization(db, { tagId: tagB, locale: 'en' });
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.tags.map((entry) => entry.name),
    ['Draft delivery label'],
  );

  await unpublishTagLocalization(db, { tagId: tagA, locale: 'fr' });
  assert.equal(
    await getPublishedTag(db, {
      locale: 'fr',
      slug: 'architecture-logicielle',
    }),
    null,
  );
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
      })
    )?.tags,
    [],
    'Unpublishing a FR Tag must hide it without falling back to EN.',
  );

  await assert.rejects(
    db
      .insertInto('writing_tags')
      .values({
        writing_id: writingB,
        tag_id: tagB,
        position: 0,
      })
      .execute(),
  );

  process.stdout.write(
    'AKS-103 localized Tag qualification passed: canonical-key deduplication, reusable many-to-many relations, independent EN/FR publication, deep links, Writing snapshot isolation, and controlled relation ordering are enforced.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', 'in', [writingA, writingB]).execute();
  await db.deleteFrom('tags').where('id', 'in', [tagA, tagB]).execute();
  await db.destroy();
}
