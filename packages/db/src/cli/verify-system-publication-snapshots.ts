import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import { getPublishedSystem } from '../public-system.js';
import {
  markSystemDraft,
  publishSystemLocalization,
  unpublishSystemLocalization,
} from '../system-publication.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const systemId = randomUUID();
const technologyId = randomUUID();

try {
  await db.insertInto('systems').values({
    id: systemId,
    evidence_policy: 'documented_only',
    editorial_position: 9000,
  }).execute();

  await db.insertInto('system_localizations').values({
    system_id: systemId,
    locale: 'en',
    slug: 'snapshot-qualification',
    title: 'Published title',
    summary: 'Snapshot qualification summary.',
    proof_role: 'Qualification fixture',
    proof_maturity: 'Implemented test fixture',
    proof_demo_nature: 'No demo',
    proof_data_nature: 'Synthetic qualification data',
    proof_limits: 'Not product evidence.',
    presentation_document: {
      version: 1,
      blocks: [{ type: 'paragraph', text: 'Published body.' }],
    },
  }).execute();

  await db
    .insertInto('technologies')
    .values({
      id: technologyId,
      slug: 'snapshot-react',
      name: 'React',
    })
    .execute();

  await db
    .insertInto('system_technologies')
    .values({
      system_id: systemId,
      technology_id: technologyId,
      position: 0,
    })
    .execute();

  await db
    .insertInto('system_technology_localizations')
    .values({
      system_id: systemId,
      technology_id: technologyId,
      locale: 'en',
      evidence: 'Published React evidence.',
    })
    .execute();

  await db.insertInto('system_links').values([
    {
      id: randomUUID(),
      system_id: systemId,
      kind: 'live',
      url: 'https://example.invalid/live',
      position: 0,
    },
    {
      id: randomUUID(),
      system_id: systemId,
      kind: 'documentation',
      url: 'https://example.invalid/docs',
      label_en: 'Qualification documentation',
      label_fr: 'Documentation de qualification',
      position: 1,
    },
  ]).execute();

  await publishSystemLocalization(db, { systemId, locale: 'en' });

  const published = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(published);
  assert.equal(published.title, 'Published title');
  assert.equal(published.technologies[0]?.evidence, 'Published React evidence.');
  assert.deepEqual(
    published.links.map(({ kind }) => kind),
    ['documentation'],
    'documented_only must be enforced in the public snapshot',
  );

  await db.updateTable('system_localizations').set({
    title: 'Unpublished draft title',
    updated_at: new Date(),
  }).where('system_id', '=', systemId).where('locale', '=', 'en').execute();
  await db
    .updateTable('system_technology_localizations')
    .set({
      evidence: 'Unpublished draft React evidence.',
      updated_at: new Date(),
    })
    .where('system_id', '=', systemId)
    .where('technology_id', '=', technologyId)
    .where('locale', '=', 'en')
    .executeTakeFirstOrThrow();
  await markSystemDraft(db, { systemId, locale: 'en' });

  const stillPublished = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(stillPublished);
  assert.equal(
    stillPublished.title,
    'Published title',
    'draft edits must not mutate the public snapshot',
  );
  assert.equal(
    stillPublished.technologies[0]?.evidence,
    'Published React evidence.',
    'draft technology evidence must not leak into the public System snapshot',
  );

  await publishSystemLocalization(db, { systemId, locale: 'en' });
  const republished = await getPublishedSystem(db, {
    locale: 'en',
    slug: 'snapshot-qualification',
  });
  assert.ok(republished);
  assert.equal(republished.title, 'Unpublished draft title');
  assert.equal(
    republished.technologies[0]?.evidence,
    'Unpublished draft React evidence.',
    'republishing must atomically publish the localized technology evidence',
  );

  await unpublishSystemLocalization(db, { systemId, locale: 'en' });
  assert.equal(
    await getPublishedSystem(db, {
      locale: 'en',
      slug: 'snapshot-qualification',
    }),
    null,
  );

  process.stdout.write('System publication snapshot qualification passed.\n');
} finally {
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.deleteFrom('technologies').where('id', '=', technologyId).execute();
  await db.destroy();
}
