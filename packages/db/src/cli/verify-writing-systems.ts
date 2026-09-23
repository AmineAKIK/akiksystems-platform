import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedWriting,
  listPublishedWritingsForSystem,
  publishWritingLocalization,
} from '../writing-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const systemA = randomUUID();
const systemB = randomUUID();
const writingA = randomUUID();
const writingB = randomUUID();

function systemSnapshot(
  systemId: string,
  locale: 'en' | 'fr',
  slug: string,
  title: string,
  summary: string,
) {
  return {
    version: 1,
    systemId,
    locale,
    presentationKind: 'standard',
    evidencePolicy: 'all_supported',
    slug,
    title,
    summary,
    proofTransparency: {
      role: 'Implemented by Amine.',
      maturity: 'Published reference.',
      demoNature: 'Qualification-only public System.',
      dataNature: 'Synthetic qualification data.',
      limits: 'AKS-104 relation qualification.',
    },
    presentationDocument: {
      version: 1,
      blocks: [
        {
          id: 'aks-104-qualification',
          type: 'paragraph',
          text: 'Writing and System relation qualification.',
        },
      ],
    },
    technologies: [],
    origin: null,
    links: [],
    media: [],
  };
}

try {
  const [systemPositionRow, writingPositionRow] = await Promise.all([
    db
      .selectFrom('systems')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst(),
    db
      .selectFrom('writings')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst(),
  ]);
  const systemPosition = (systemPositionRow?.max_position ?? -1) + 1;
  const writingPosition = (writingPositionRow?.max_position ?? -1) + 1;

  await db
    .insertInto('systems')
    .values([
      { id: systemA, editorial_position: systemPosition },
      { id: systemB, editorial_position: systemPosition + 1 },
    ])
    .execute();

  const now = new Date();
  await db
    .insertInto('system_publications')
    .values([
      {
        system_id: systemA,
        locale: 'en',
        slug: 'aks104-system-a',
        snapshot: systemSnapshot(
          systemA,
          'en',
          'aks104-system-a',
          'AKS-104 System A',
          'Published Sentinel system summary.',
        ) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      },
      {
        system_id: systemA,
        locale: 'fr',
        slug: 'aks104-system-a',
        snapshot: systemSnapshot(
          systemA,
          'fr',
          'aks104-system-a',
          'AKS-104 Système A',
          'Résumé publié du système Sentinel.',
        ) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      },
      {
        system_id: systemB,
        locale: 'en',
        slug: 'aks104-system-b',
        snapshot: systemSnapshot(
          systemB,
          'en',
          'aks104-system-b',
          'AKS-104 System B',
          'Published ProtoCap system summary.',
        ) as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
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
        editorial_position: writingPosition,
      },
      {
        id: writingB,
        kind: 'article',
        editorial_weight: 'normal',
        editorial_position: writingPosition + 1,
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
        summary: 'A Writing related to two Systems.',
      },
      {
        writing_id: writingA,
        locale: 'fr',
        slug: 'architecture-sans-page-builder',
        title: 'Architecture sans page builder',
        summary: 'Un écrit relié à deux systèmes.',
      },
      {
        writing_id: writingB,
        locale: 'en',
        slug: 'shipping-small-systems',
        title: 'Shipping Small Systems',
        summary: 'A second Writing related to Sentinel.',
      },
      {
        writing_id: writingB,
        locale: 'fr',
        slug: 'livrer-petits-systemes',
        title: 'Livrer de petits systèmes',
        summary: 'Un second écrit relié à Sentinel.',
      },
    ])
    .execute();

  await db
    .insertInto('writing_systems')
    .values([
      { writing_id: writingA, system_id: systemA, position: 0 },
      { writing_id: writingA, system_id: systemB, position: 1 },
      { writing_id: writingB, system_id: systemA, position: 0 },
    ])
    .execute();

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });
  await publishWritingLocalization(db, { writingId: writingA, locale: 'fr' });
  await publishWritingLocalization(db, { writingId: writingB, locale: 'en' });
  await publishWritingLocalization(db, { writingId: writingB, locale: 'fr' });

  const englishWriting = await getPublishedWriting(db, {
    locale: 'en',
    slug: 'architecture-without-page-builders',
  });
  assert.deepEqual(
    englishWriting?.systemIds,
    [systemA, systemB],
    'Writing publication must capture ordered System identities.',
  );
  assert.deepEqual(
    englishWriting?.systems.map((system) => ({
      id: system.id,
      title: system.title,
      summary: system.summary,
    })),
    [
      {
        id: systemA,
        title: 'AKS-104 System A',
        summary: 'Published Sentinel system summary.',
      },
      {
        id: systemB,
        title: 'AKS-104 System B',
        summary: 'Published ProtoCap system summary.',
      },
    ],
  );

  const frenchWriting = await getPublishedWriting(db, {
    locale: 'fr',
    slug: 'architecture-sans-page-builder',
  });
  assert.deepEqual(
    frenchWriting?.systemIds,
    [systemA, systemB],
    'FR Writing snapshot keeps the same stable System identities.',
  );
  assert.deepEqual(
    frenchWriting?.systems.map((system) => system.id),
    [systemA],
    'A System without an FR publication must not fall back to EN.',
  );

  const sentinelEnglish = await listPublishedWritingsForSystem(db, {
    locale: 'en',
    systemId: systemA,
  });
  assert.deepEqual(
    sentinelEnglish.map((writing) => writing.writingId),
    [writingA, writingB],
    'One System must resolve all related published Writings.',
  );

  const sentinelFrench = await listPublishedWritingsForSystem(db, {
    locale: 'fr',
    systemId: systemA,
  });
  assert.deepEqual(
    sentinelFrench.map((writing) => writing.writingId),
    [writingA, writingB],
    'System -> Writing navigation must remain bilingual.',
  );

  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('writing_systems')
      .where('writing_id', '=', writingA)
      .where('system_id', '=', systemA)
      .execute();

    await transaction
      .updateTable('writing_systems')
      .set({ position: 0 })
      .where('writing_id', '=', writingA)
      .where('system_id', '=', systemB)
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
    )?.systemIds,
    [systemA, systemB],
    'Draft relation edits must not leak into the existing EN Writing snapshot.',
  );
  assert.equal(
    (
      await listPublishedWritingsForSystem(db, {
        locale: 'en',
        systemId: systemA,
      })
    ).some((writing) => writing.writingId === writingA),
    true,
    'Draft unlinking must not remove Writing A from the public System page.',
  );

  await publishWritingLocalization(db, { writingId: writingA, locale: 'en' });

  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.systemIds,
    [systemB],
  );
  assert.equal(
    (
      await listPublishedWritingsForSystem(db, {
        locale: 'en',
        systemId: systemA,
      })
    ).some((writing) => writing.writingId === writingA),
    false,
    'Republishing EN must update the EN System -> Writing relation.',
  );
  assert.equal(
    (
      await listPublishedWritingsForSystem(db, {
        locale: 'fr',
        systemId: systemA,
      })
    ).some((writing) => writing.writingId === writingA),
    true,
    'EN republish must not mutate the still-published FR relation snapshot.',
  );

  await db
    .updateTable('system_publications')
    .set({
      snapshot: systemSnapshot(
        systemB,
        'en',
        'aks104-system-b',
        'AKS-104 System B',
        'Updated System-owned summary after Writing publication.',
      ) as unknown as Record<string, unknown>,
      updated_at: new Date(),
    })
    .where('system_id', '=', systemB)
    .where('locale', '=', 'en')
    .execute();

  assert.deepEqual(
    (
      await getPublishedWriting(db, {
        locale: 'en',
        slug: 'architecture-without-page-builders',
      })
    )?.systems.map((system) => system.summary),
    ['Updated System-owned summary after Writing publication.'],
    'Writing must resolve current published System metadata instead of copying System summaries into the relation snapshot.',
  );

  await assert.rejects(
    db
      .insertInto('writing_systems')
      .values({
        writing_id: writingB,
        system_id: systemB,
        position: 0,
      })
      .execute(),
  );

  process.stdout.write(
    'AKS-104 Writing/System qualification passed: bidirectional published navigation, ordered reusable relations, independent EN/FR snapshots, draft isolation, locale-safe System resolution, and no copied System summaries are enforced.\n',
  );
} finally {
  await db.deleteFrom('writings').where('id', 'in', [writingA, writingB]).execute();
  await db.deleteFrom('systems').where('id', 'in', [systemA, systemB]).execute();
  await db.destroy();
}
