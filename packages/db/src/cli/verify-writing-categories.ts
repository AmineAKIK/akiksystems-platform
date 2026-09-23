import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedCategory,
  listPublishedCategories,
  publishCategoryLocalization,
  unpublishCategoryLocalization,
} from '../category-publication.js';
import {
  getPublishedWriting,
  listPublishedWritingsForCategory,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const categoryA = randomUUID();
const categoryB = randomUUID();
const writingA = randomUUID();
const writingB = randomUUID();

try {
  await db
    .insertInto('categories')
    .values([
      { id: categoryA, editorial_position: 0 },
      { id: categoryB, editorial_position: 1 },
    ])
    .execute();

  await db
    .insertInto('category_localizations')
    .values([
      {
        category_id: categoryA,
        locale: 'en',
        slug: 'engineering-practice',
        name: 'Engineering practice',
        description: 'Methods and architectural choices grounded in delivery.',
      },
      {
        category_id: categoryA,
        locale: 'fr',
        slug: 'pratique-ingenierie',
        name: 'Pratique d’ingénierie',
        description: 'Méthodes et choix d’architecture ancrés dans la livraison.',
      },
      {
        category_id: categoryB,
        locale: 'en',
        slug: 'product-thinking',
        name: 'Product thinking',
        description: 'Product decisions connected to software structure.',
      },
      {
        category_id: categoryB,
        locale: 'fr',
        slug: 'pensee-produit',
        name: 'Pensée produit',
        description: 'Décisions produit reliées à la structure logicielle.',
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
        summary: 'A second Writing that reuses the same editorial category.',
      },
      {
        writing_id: writingB,
        locale: 'fr',
        slug: 'livrer-petits-systemes',
        title: 'Livrer de petits systèmes',
        summary: 'Un second écrit réutilisant la même catégorie éditoriale.',
      },
    ])
    .execute();

  await db
    .insertInto('writing_categories')
    .values([
      { writing_id: writingA, category_id: categoryA, position: 0 },
      { writing_id: writingA, category_id: categoryB, position: 1 },
      { writing_id: writingB, category_id: categoryA, position: 0 },
    ])
    .execute();

  await publishCategoryLocalization(db, { categoryId: categoryA, locale: 'en' });
  await publishCategoryLocalization(db, { categoryId: categoryA, locale: 'fr' });
  await publishCategoryLocalization(db, { categoryId: categoryB, locale: 'en' });

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });
  await publishWritingLocalization(db, { writingId: writingA, locale: 'fr' });
  await publishWritingLocalization(db, { writingId: writingB, locale: 'en' });

  const englishCategories = await listPublishedCategories(db, 'en');
  assert.deepEqual(
    englishCategories.map((category) => category.categoryId),
    [categoryA, categoryB],
  );
  assert.deepEqual(
    (await listPublishedCategories(db, 'fr')).map(
      (category) => category.categoryId,
    ),
    [categoryA],
    'A missing FR publication must not fall back to EN.',
  );

  const category = await getPublishedCategory(db, {
    locale: 'en',
    slug: 'engineering-practice',
  });
  assert.equal(category?.name, 'Engineering practice');
  assert.equal(category?.alternate?.slug, 'pratique-ingenierie');

  const englishWriting = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'architecture-without-page-builders',
  });
  assert.deepEqual(
    englishWriting?.categories.map((entry) => entry.name),
    ['Engineering practice', 'Product thinking'],
  );

  const frenchWriting = await getPublishedWriting(db, {
    locale: 'fr',
    slug: 'architecture-sans-page-builder',
  });
  assert.deepEqual(
    frenchWriting?.categories.map((entry) => entry.name),
    ['Pratique d’ingénierie'],
    'FR must expose only categories published in FR.',
  );

  const reused = await listPublishedWritingsForCategory(db, {
    locale: 'en',
    categoryId: categoryA,
  });
  assert.deepEqual(
    reused.map((writing) => writing.writingId),
    [writingA, writingB],
    'One Category must be reusable across multiple Writings.',
  );

  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('writing_categories')
      .where('writing_id', '=', writingA)
      .where('category_id', '=', categoryA)
      .execute();

    await transaction
      .updateTable('writing_categories')
      .set({ position: 0 })
      .where('writing_id', '=', writingA)
      .where('category_id', '=', categoryB)
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
    )?.categories.map((entry) => entry.categoryId),
    [categoryA, categoryB],
    'Draft relation changes must not leak before Writing republication.',
  );

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.categories.map((entry) => entry.categoryId),
    [categoryB],
  );
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
      })
    )?.categoryIds,
    [categoryA, categoryB],
    'EN relation republication must not mutate the existing FR Writing snapshot.',
  );

  await db
    .updateTable('category_localizations')
    .set({
      name: 'Draft renamed category',
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('category_id', '=', categoryB)
    .where('locale', '=', 'en')
    .execute();

  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.categories.map((entry) => entry.name),
    ['Product thinking'],
    'Draft Category edits must not leak into published Writings.',
  );

  await publishCategoryLocalization(db, { categoryId: categoryB, locale: 'en' });
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.categories.map((entry) => entry.name),
    ['Draft renamed category'],
    'Publishing a Category localization must update references without republishing the Writing.',
  );

  await unpublishCategoryLocalization(db, { categoryId: categoryA, locale: 'fr' });
  assert.equal(
    await getPublishedCategory(db, {
      locale: 'fr',
      slug: 'pratique-ingenierie',
    }),
    null,
  );
  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
      })
    )?.categories,
    [],
    'Unpublishing a FR Category must hide it without falling back to EN.',
  );

  await assert.rejects(
    db
      .insertInto('writing_categories')
      .values({
        writing_id: writingB,
        category_id: categoryB,
        position: 0,
      })
      .execute(),
    undefined,
    'A Writing cannot assign two categories to the same position.',
  );

  await assert.rejects(
    db
      .insertInto('category_localizations')
      .values({
        category_id: categoryB,
        locale: 'de' as 'en',
        slug: 'nicht-erlaubt',
        name: 'Nicht erlaubt',
      })
      .execute(),
    undefined,
    'Category localization must remain constrained to EN/FR.',
  );

  process.stdout.write(
    'AKS-102 localized Category qualification passed: reusable many-to-many taxonomy, independent EN/FR publication, published category deep links, Writing snapshot isolation, and controlled relation ordering are enforced.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', 'in', [writingA, writingB]).execute();
  await db.deleteFrom('categories').where('id', 'in', [categoryA, categoryB]).execute();
  await db.destroy();
}
