import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { listPublishedSystems } from '../public-system.js';
import { createDatabase } from '../database.js';
import { bootstrapSystemPublications } from '../system-publication.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const firstId = randomUUID();
const secondId = randomUUID();
const draftId = randomUUID();
const ids: string[] = [firstId, secondId, draftId];
const document = {
  version: 1 as const,
  blocks: [{ type: 'paragraph' as const, text: 'Proof.' }],
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
        { id: firstId, editorial_position: 31, featured: false },
        { id: secondId, editorial_position: 30, featured: true },
        { id: draftId, editorial_position: 32, featured: true },
      ])
      .execute();

    await transaction
      .insertInto('system_localizations')
      .values([
        {
          system_id: firstId,
          locale: 'en',
          slug: 'first-editorial-system',
          title: 'First Editorial System',
          summary: 'Published first item.',
          presentation_document: document,
          proof_role: 'Qualification System',
          proof_maturity: 'Inspectable qualification fixture',
          proof_demo_nature: 'No separate public demo',
          proof_data_nature: 'Synthetic qualification data',
          proof_limits: 'Qualification fixture only; no deployment or impact claim.',
          editorial_state: 'published',
          published_at: new Date(),
        },
        {
          system_id: secondId,
          locale: 'en',
          slug: 'featured-editorial-system',
          title: 'Featured Editorial System',
          summary: 'Published featured item.',
          presentation_document: document,
          proof_role: 'Qualification System',
          proof_maturity: 'Inspectable qualification fixture',
          proof_demo_nature: 'No separate public demo',
          proof_data_nature: 'Synthetic qualification data',
          proof_limits: 'Qualification fixture only; no deployment or impact claim.',
          editorial_state: 'published',
          published_at: new Date(),
        },
        {
          system_id: draftId,
          locale: 'en',
          slug: 'draft-editorial-system',
          title: 'Draft Editorial System',
          summary: 'Must stay private.',
          presentation_document: document,
          proof_role: 'Qualification System',
          proof_maturity: 'Inspectable qualification fixture',
          proof_demo_nature: 'No separate public demo',
          proof_data_nature: 'Synthetic qualification data',
          proof_limits: 'Qualification fixture only; no deployment or impact claim.',
          editorial_state: 'draft',
          published_at: null,
        },
      ])
      .execute();
  });

  await bootstrapSystemPublications(db);

  const initial = await listPublishedSystems(db, { locale: 'en' });
  const relevantInitial = initial.filter(({ id }) => ids.includes(id));

  assert.deepEqual(
    relevantInitial.map(({ id, position, featured }) => ({
      id,
      position,
      featured,
    })),
    [
      { id: secondId, position: 30, featured: true },
      { id: firstId, position: 31, featured: false },
    ],
    'public library must follow configured editorial order and expose prominence only for published Systems',
  );

  await db.transaction().execute(async (transaction) => {
    await transaction
      .updateTable('systems')
      .set({ editorial_position: 33, featured: true, updated_at: new Date() })
      .where('id', '=', firstId)
      .execute();
    await transaction
      .updateTable('systems')
      .set({ editorial_position: 31, featured: false, updated_at: new Date() })
      .where('id', '=', secondId)
      .execute();
    await transaction
      .updateTable('systems')
      .set({ editorial_position: 30, updated_at: new Date() })
      .where('id', '=', firstId)
      .execute();
  });

  const reordered = await listPublishedSystems(db, { locale: 'en' });
  const relevantReordered = reordered.filter(({ id }) => ids.includes(id));

  assert.deepEqual(
    relevantReordered.map(({ id, position, featured }) => ({
      id,
      position,
      featured,
    })),
    [
      { id: firstId, position: 30, featured: true },
      { id: secondId, position: 31, featured: false },
    ],
    'changing persisted editorial controls must immediately change the public projection without code changes',
  );

  const serialized = JSON.stringify(relevantReordered);
  assert.doesNotMatch(serialized, /Draft Editorial System/);
  assert.doesNotMatch(serialized, /editorial_state|archived_at/);

  process.stdout.write(
    'System editorial controls verification passed: persisted order and prominence drive the published library without exposing drafts.\n',
  );
} finally {
  await db.deleteFrom('systems').where('id', 'in', ids).execute();
  await db.destroy();
}
