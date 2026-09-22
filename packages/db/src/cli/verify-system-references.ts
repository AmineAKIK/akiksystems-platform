import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import {
  listPublishedSystemReferences,
  systemReferenceHref,
} from '../system-reference.js';
import { createDatabase } from '../database.js';
import { bootstrapSystemPublications } from '../system-publication.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const ids = {
  published: randomUUID(),
  draft: randomUUID(),
  enOnly: randomUUID(),
};

const proof = {
  role: 'Qualification System',
  maturity: 'Inspectable implementation',
  demo: 'No separate public demo',
  data: 'Synthetic qualification data',
  limits: 'Qualification fixture only; no deployment claim.',
};

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);
  if (migrationResult.error !== undefined) throw migrationResult.error;

  await db
    .insertInto('systems')
    .values([
      { id: ids.published, editorial_position: 10 },
      { id: ids.draft, editorial_position: 11 },
      { id: ids.enOnly, editorial_position: 12 },
    ])
    .execute();

  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: ids.published,
        locale: 'en',
        slug: 'reference-published',
        title: 'Published Reference',
        summary: 'Published English reference.',
        proof_role: proof.role,
        proof_maturity: proof.maturity,
        proof_demo_nature: proof.demo,
        proof_data_nature: proof.data,
        proof_limits: proof.limits,
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'Published evidence.' }],
        },
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: ids.published,
        locale: 'fr',
        slug: 'reference-publiee',
        title: 'Référence publiée',
        summary: 'Référence française publiée.',
        proof_role: 'Système de qualification',
        proof_maturity: 'Implémentation inspectable',
        proof_demo_nature: 'Aucune démo publique séparée',
        proof_data_nature: 'Données de qualification synthétiques',
        proof_limits: 'Fixture de qualification uniquement ; aucun déploiement revendiqué.',
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'Preuve publiée.' }],
        },
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: ids.draft,
        locale: 'en',
        slug: 'reference-draft',
        title: 'Draft Reference',
        summary: 'Must remain private.',
        proof_role: proof.role,
        proof_maturity: proof.maturity,
        proof_demo_nature: proof.demo,
        proof_data_nature: proof.data,
        proof_limits: proof.limits,
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'Draft evidence.' }],
        },
        editorial_state: 'draft',
      },
      {
        system_id: ids.enOnly,
        locale: 'en',
        slug: 'reference-en-only',
        title: 'English-only Reference',
        summary: 'Published only in English.',
        proof_role: proof.role,
        proof_maturity: proof.maturity,
        proof_demo_nature: proof.demo,
        proof_data_nature: proof.data,
        proof_limits: proof.limits,
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'English-only evidence.' }],
        },
        editorial_state: 'published',
        published_at: new Date(),
      },
    ])
    .execute();

  await bootstrapSystemPublications(db);

  const english = await listPublishedSystemReferences(db, {
    locale: 'en',
    ids: [ids.published, ids.draft, ids.enOnly],
  });
  assert.deepEqual(
    english.map(({ id }) => id),
    [ids.published, ids.enOnly],
  );
  assert.equal(english[0]?.href, '/en/systems/reference-published');
  assert.equal(english[0]?.proofTransparency.role, proof.role);
  assert.equal(
    english.some(({ id }) => id === ids.draft),
    false,
    'Draft Systems must never resolve as public references.',
  );

  const french = await listPublishedSystemReferences(db, {
    locale: 'fr',
    ids: [ids.published, ids.draft, ids.enOnly],
  });
  assert.deepEqual(
    french.map(({ id }) => id),
    [ids.published],
    'Missing French localization must disappear rather than fall back to English.',
  );
  assert.equal(french[0]?.href, '/fr/systems/reference-publiee');
  assert.equal(
    french[0]?.proofTransparency.maturity,
    'Implémentation inspectable',
  );

  assert.equal(
    systemReferenceHref('en', 'sentinel'),
    '/en/systems/sentinel',
  );
  assert.equal(
    systemReferenceHref('fr', 'sentinel'),
    '/fr/systems/sentinel',
  );

  process.stdout.write(
    'System reference verification passed: active published localized Systems resolve through one locale-safe contract, while drafts and missing localizations disappear without fallback.\n',
  );
} finally {
  await db
    .deleteFrom('systems')
    .where('id', 'in', Object.values(ids))
    .execute();
  await db.destroy();
}
