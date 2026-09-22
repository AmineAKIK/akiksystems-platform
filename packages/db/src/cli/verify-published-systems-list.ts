import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { listPublishedSystems } from '../public-system.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());

const firstPublishedId = randomUUID();
const secondPublishedId = randomUUID();
const draftId = randomUUID();
const archivedId = randomUUID();
const systemIds = [
  firstPublishedId,
  secondPublishedId,
  draftId,
  archivedId,
];

const presentationDocument = {
  version: 1 as const,
  blocks: [{ type: 'paragraph' as const, text: 'Published proof.' }],
};

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('systems')
      .values([
        {
          id: firstPublishedId,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: secondPublishedId,
          created_at: new Date('2026-02-01T00:00:00.000Z'),
        },
        {
          id: draftId,
          created_at: new Date('2025-12-01T00:00:00.000Z'),
        },
        {
          id: archivedId,
          lifecycle: 'archived',
          archived_at: new Date('2026-03-01T00:00:00.000Z'),
          created_at: new Date('2025-11-01T00:00:00.000Z'),
        },
      ])
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: firstPublishedId,
          locale: 'en',
          slug: 'first-system',
          title: 'First System',
          summary: 'First published English summary.',
          presentation_document: presentationDocument,
          editorial_state: 'published',
          published_at: new Date('2026-04-01T00:00:00.000Z'),
        },
        {
          system_id: firstPublishedId,
          locale: 'fr',
          slug: 'premier-systeme',
          title: 'Premier système',
          summary: 'Premier résumé français publié.',
          presentation_document: presentationDocument,
          editorial_state: 'published',
          published_at: new Date('2026-04-02T00:00:00.000Z'),
        },
        {
          system_id: secondPublishedId,
          locale: 'en',
          slug: 'second-system',
          title: 'Second System',
          summary: 'Second published English summary.',
          presentation_document: presentationDocument,
          editorial_state: 'published',
          published_at: new Date('2026-05-01T00:00:00.000Z'),
        },
        {
          system_id: secondPublishedId,
          locale: 'fr',
          slug: 'deuxieme-systeme',
          title: 'Deuxième système',
          summary: 'Brouillon français.',
          presentation_document: presentationDocument,
          editorial_state: 'draft',
          published_at: null,
        },
        {
          system_id: draftId,
          locale: 'en',
          slug: 'draft-system',
          title: 'Draft System',
          summary: 'This must stay private.',
          presentation_document: presentationDocument,
          editorial_state: 'draft',
          published_at: null,
        },
        {
          system_id: archivedId,
          locale: 'en',
          slug: 'archived-system',
          title: 'Archived System',
          summary: 'This published localization belongs to an archived System.',
          presentation_document: presentationDocument,
          editorial_state: 'published',
          published_at: new Date('2026-03-01T00:00:00.000Z'),
        },
      ])
      .execute();
  });

  const english = await listPublishedSystems(db, { locale: 'en' });

  assert.deepEqual(
    english.map(({ id, slug, title }) => ({ id, slug, title })),
    [
      {
        id: firstPublishedId,
        slug: 'first-system',
        title: 'First System',
      },
      {
        id: secondPublishedId,
        slug: 'second-system',
        title: 'Second System',
      },
    ],
    'English library must contain only active published Systems in stable creation order',
  );

  const french = await listPublishedSystems(db, { locale: 'fr' });

  assert.deepEqual(
    french.map(({ id, slug, title }) => ({ id, slug, title })),
    [
      {
        id: firstPublishedId,
        slug: 'premier-systeme',
        title: 'Premier système',
      },
    ],
    'French library must respect independent localized publication',
  );

  const serialized = JSON.stringify({ english, french });
  assert.doesNotMatch(serialized, /Draft System|Archived System|Brouillon français/);
  assert.doesNotMatch(serialized, /editorial_state|archived_at|presentation_document/);

  process.stdout.write(
    'Published Systems list verification passed: locale-specific publication, draft/archive exclusion, stable ordering, and public projection are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', 'in', systemIds).execute();
  await db.destroy();
}
