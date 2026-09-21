import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import {
  parsePresentationDocument,
  validatePresentationDocument,
} from '@akiksystems/core';
import { sql } from 'kysely';

import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

interface PostgreSqlError {
  code?: string;
  constraint?: string;
}

function postgresError(error: unknown): PostgreSqlError {
  assert.ok(error !== null && typeof error === 'object');
  return error as PostgreSqlError;
}

async function expectPostgresError(
  expectedCode: string,
  expectedConstraint: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  let caught: unknown;

  try {
    await operation();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught !== undefined, `Expected PostgreSQL error ${expectedCode}.`);

  const postgres = postgresError(caught);
  assert.equal(postgres.code, expectedCode);
  assert.equal(postgres.constraint, expectedConstraint);
}

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();

const presentationDocument = parsePresentationDocument({
  version: 1,
  blocks: [
    { type: 'heading', level: 2, text: 'Context' },
    {
      type: 'paragraph',
      text: 'Sentinel provides operational visibility without exposing draft data.',
    },
    {
      type: 'list',
      style: 'unordered',
      items: ['Architecture', 'Security', 'Observability'],
    },
    {
      type: 'code',
      code: 'pnpm build',
      language: 'bash',
    },
    {
      type: 'image',
      assetId: randomUUID(),
    },
    {
      type: 'quote',
      text: 'Evidence stays close to claims.',
      attribution: null,
    },
  ],
});

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);

  if (migrationResult.error !== undefined) {
    throw migrationResult.error;
  }

  await db.insertInto('systems').values({ id: systemId }).execute();

  await db
    .insertInto('system_localizations')
    .values({
      system_id: systemId,
      locale: 'en',
      slug: 'sentinel-presentation-test',
      title: 'Sentinel',
      summary: 'Presentation schema verification.',
      presentation_document: presentationDocument,
    })
    .execute();

  const stored = await db
    .selectFrom('system_localizations')
    .select('presentation_document')
    .where('system_id', '=', systemId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();

  assert.deepEqual(stored.presentation_document, presentationDocument);

  const validation = validatePresentationDocument(stored.presentation_document);
  assert.equal(validation.success, true);
  assert.deepEqual(validation.errors, []);

  await expectPostgresError(
    '23514',
    'system_localizations_presentation_document_check',
    () =>
      sql`
        update system_localizations
        set presentation_document = ${JSON.stringify({
          version: 2,
          blocks: [],
        })}::jsonb
        where system_id = ${systemId}::uuid
          and locale = 'en'
      `.execute(db),
  );

  await expectPostgresError(
    '23514',
    'system_localizations_presentation_document_check',
    () =>
      sql`
        update system_localizations
        set presentation_document = ${JSON.stringify({
          version: 1,
          blocks: [],
          template: 'two-column',
        })}::jsonb
        where system_id = ${systemId}::uuid
          and locale = 'en'
      `.execute(db),
  );

  const unsafe = validatePresentationDocument({
    version: 1,
    blocks: [
      {
        type: 'paragraph',
        text: 'Visible text',
        html: '<script>alert(1)</script>',
      },
    ],
  });

  assert.equal(unsafe.success, false);

  process.stdout.write(
    'Presentation document verification passed: localized JSONB persistence, versioning, explicit blocks, and anti-page-builder boundaries are enforced.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.destroy();
}
