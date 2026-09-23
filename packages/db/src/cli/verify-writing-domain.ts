import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedWriting,
  listPublishedWritings,
  publishWritingLocalization,
  unpublishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const writingId = randomUUID();

try {
  await db
    .insertInto('writings')
    .values({
      id: writingId,
      kind: 'article',
      editorial_weight: 'featured',
      editorial_position: 7,
    })
    .execute();

  await db
    .insertInto('writing_localizations')
    .values([
      {
        writing_id: writingId,
        locale: 'en',
        slug: 'qualified-writing',
        title: 'Qualified Writing',
        summary: 'A controlled editorial publication.',
        body: 'First paragraph.\n\nSecond paragraph.',
      },
      {
        writing_id: writingId,
        locale: 'fr',
        slug: 'ecrit-qualifie',
        title: 'Écrit qualifié',
        summary: 'Une publication éditoriale contrôlée.',
        body: 'Premier paragraphe.\n\nDeuxième paragraphe.',
      },
    ])
    .execute();

  await publishWritingLocalization(db, { writingId, locale: 'en' });
  await publishWritingLocalization(db, { writingId, locale: 'fr' });

  const english = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'qualified-writing',
  });
  assert.ok(english);
  assert.equal(english.kind, 'article');
  assert.equal(english.editorialWeight, 'featured');
  assert.equal(english.editorialPosition, 7);
  assert.equal(english.alternate?.slug, 'ecrit-qualifie');

  const listed = await listPublishedWritings(db, 'en');
  assert.deepEqual(
    listed.map((writing) => writing.writingId),
    [writingId],
  );

  await db
    .updateTable('writings')
    .set({
      kind: 'essay',
      editorial_weight: 'major',
      updated_at: new Date(),
    })
    .where('id', '=', writingId)
    .execute();

  await db
    .updateTable('writing_localizations')
    .set({
      title: 'Draft changed title',
      summary: 'Draft changed summary.',
      body: 'Draft body must not leak.',
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('writing_id', '=', writingId)
    .where('locale', '=', 'en')
    .execute();

  const stablePublic = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'qualified-writing',
  });
  assert.equal(stablePublic?.title, 'Qualified Writing');
  assert.equal(stablePublic?.kind, 'article');
  assert.equal(stablePublic?.editorialWeight, 'featured');

  await publishWritingLocalization(db, { writingId, locale: 'en' });
  const republished = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'qualified-writing',
  });
  assert.equal(republished?.title, 'Draft changed title');
  assert.equal(republished?.kind, 'essay');
  assert.equal(republished?.editorialWeight, 'major');

  const frenchStillIndependent = await getPublishedWriting(db, {
    locale: 'fr',
    slug: 'ecrit-qualifie',
  });
  assert.equal(frenchStillIndependent?.kind, 'article');
  assert.equal(frenchStillIndependent?.editorialWeight, 'featured');

  await unpublishWritingLocalization(db, { writingId, locale: 'fr' });
  assert.equal(
    await getPublishedWriting(db, {
      locale: 'fr',
      slug: 'ecrit-qualifie',
    }),
    null,
  );
  assert.equal(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'qualified-writing',
      })
    )?.alternate,
    null,
  );

  await assert.rejects(
    db.insertInto('writings').values({
      id: randomUUID(),
      kind: 'invalid' as 'note',
      editorial_weight: 'normal',
      editorial_position: 8,
    }).execute(),
  );

  await assert.rejects(
    db.insertInto('writings').values({
      id: randomUUID(),
      kind: 'note',
      editorial_weight: 'invalid' as 'normal',
      editorial_position: 8,
    }).execute(),
  );

  process.stdout.write(
    'AKS-101 Writing domain qualification passed: NOTE/ARTICLE/ESSAY kinds, NORMAL/FEATURED/MAJOR editorial weight, bilingual deep publication snapshots, draft isolation, and independent unpublication are enforced.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', '=', writingId).execute();
  await db.destroy();
}
