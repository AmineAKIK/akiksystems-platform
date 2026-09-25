import assert from 'node:assert/strict';

import type { WritingDocument } from '@akiksystems/core';

import { createDatabase } from '../database.js';
import {
  getPublishedLegalPage,
  legalPageKeys,
  listPublishedLegalPageKeys,
  publishLegalPageLocalization,
  unpublishLegalPageLocalization,
} from '../legal-page.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

const firstDocument: WritingDocument = {
  version: 1,
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Qualification section' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Qualification text proving controlled legal-page publication.',
        },
      ],
    },
  ],
};

const secondDocument: WritingDocument = {
  version: 1,
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Updated draft that must not leak before republication.',
        },
      ],
    },
  ],
};

try {
  const pages = await db
    .selectFrom('legal_pages')
    .select(['id', 'page_key'])
    .execute();

  assert.deepEqual(
    legalPageKeys.map((pageKey) => pages.some((page) => page.page_key === pageKey)),
    [true, true, true],
    'Migration must provision exactly the three structural legal-page identities.',
  );

  const pageIds = pages.map(({ id }) => id);
  assert.equal(pageIds.length, 3);

  const localizations = await db
    .selectFrom('legal_page_localizations')
    .select([
      'page_id',
      'locale',
      'title',
      'editor_document',
      'editorial_state',
      'published_at',
    ])
    .where('page_id', 'in', pageIds)
    .execute();

  assert.equal(localizations.length, 6);
  assert.ok(
    localizations.every(
      (row) =>
        row.title === null &&
        row.editor_document === null &&
        row.editorial_state === 'draft' &&
        row.published_at === null,
    ),
    'Migration must not hardcode legal copy or publish invented content.',
  );

  assert.deepEqual(await listPublishedLegalPageKeys(db, 'en'), []);
  assert.deepEqual(await listPublishedLegalPageKeys(db, 'fr'), []);

  const privacy = pages.find(({ page_key }) => page_key === 'privacy');
  assert.ok(privacy);

  await db
    .updateTable('legal_page_localizations')
    .set({
      title: 'Qualification privacy',
      editor_document: firstDocument as unknown as Record<string, unknown>,
      updated_at: new Date(),
    })
    .where('page_id', '=', privacy.id)
    .where('locale', '=', 'en')
    .execute();

  const firstSnapshot = await publishLegalPageLocalization(db, {
    pageKey: 'privacy',
    locale: 'en',
  });
  assert.equal(firstSnapshot.title, 'Qualification privacy');
  assert.deepEqual(firstSnapshot.document, firstDocument);
  assert.deepEqual(await listPublishedLegalPageKeys(db, 'en'), ['privacy']);
  assert.equal(
    await getPublishedLegalPage(db, { pageKey: 'privacy', locale: 'fr' }),
    null,
    'Locales must publish independently.',
  );

  await db
    .updateTable('legal_page_localizations')
    .set({
      title: 'Qualification privacy updated draft',
      editor_document: secondDocument as unknown as Record<string, unknown>,
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('page_id', '=', privacy.id)
    .where('locale', '=', 'en')
    .execute();

  const stillPublished = await getPublishedLegalPage(db, {
    pageKey: 'privacy',
    locale: 'en',
  });
  assert.equal(
    stillPublished?.title,
    'Qualification privacy',
    'Editing a draft must preserve the last public snapshot.',
  );
  assert.deepEqual(stillPublished?.document, firstDocument);

  await publishLegalPageLocalization(db, {
    pageKey: 'privacy',
    locale: 'en',
  });
  const republished = await getPublishedLegalPage(db, {
    pageKey: 'privacy',
    locale: 'en',
  });
  assert.equal(republished?.title, 'Qualification privacy updated draft');
  assert.deepEqual(republished?.document, secondDocument);

  const invalidDocument: WritingDocument = {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'codeBlock',
        content: [{ type: 'text', text: 'not valid for a legal page' }],
      },
    ],
  };

  await db
    .updateTable('legal_page_localizations')
    .set({
      editor_document: invalidDocument as unknown as Record<string, unknown>,
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('page_id', '=', privacy.id)
    .where('locale', '=', 'en')
    .execute();

  await assert.rejects(
    publishLegalPageLocalization(db, {
      pageKey: 'privacy',
      locale: 'en',
    }),
    /controlled editorial schema/i,
  );

  await unpublishLegalPageLocalization(db, {
    pageKey: 'privacy',
    locale: 'en',
  });
  assert.equal(
    await getPublishedLegalPage(db, { pageKey: 'privacy', locale: 'en' }),
    null,
  );

  await db
    .deleteFrom('legal_page_publications')
    .where('page_id', 'in', pageIds)
    .execute();
  await db
    .updateTable('legal_page_localizations')
    .set({
      title: null,
      editor_document: null,
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('page_id', 'in', pageIds)
    .execute();

  process.stdout.write(
    'Legal-page qualification passed: structural rows contain no invented copy, locales publish independently, drafts preserve public snapshots, and media/code blocks cannot be published.\n',
  );
} finally {
  await db.destroy();
}
