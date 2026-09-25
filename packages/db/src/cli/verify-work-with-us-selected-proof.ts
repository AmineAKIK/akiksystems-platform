import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { createDatabase } from '../database.js';
import { listWorkWithUsProofReferences } from '../work-with-us-proof.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const protoCapAssetId = randomUUID();
const oriaAssetId = randomUUID();
const tugeresAssetId = randomUUID();
const localePartialSystemId = randomUUID();
const overflowSystemId = randomUUID();
const createdSystemIds: string[] = [];
const createdAssetIds: string[] = [];

const existingPage = await db
  .selectFrom('work_with_us_pages')
  .select('id')
  .where('singleton_key', '=', 'public')
  .executeTakeFirst();
const pageId = existingPage?.id ?? randomUUID();
const createdPage = existingPage === undefined;
const previousSelections =
  existingPage === undefined
    ? []
    : await db
        .selectFrom('work_with_us_systems')
        .select(['system_id', 'position'])
        .where('page_id', '=', pageId)
        .orderBy('position')
        .execute();

try {
  if (createdPage) {
    await db
      .insertInto('work_with_us_pages')
      .values({ id: pageId, singleton_key: 'public' })
      .execute();
  } else {
    await db
      .deleteFrom('work_with_us_systems')
      .where('page_id', '=', pageId)
      .execute();
  }

  const protoCap = await bootstrapProtoCapDomain(db, {
    media: {
      id: protoCapAssetId,
      storageKey: 'qualification/work-with-us-selection/protocap.png',
      originalFilename: 'protocap-work-with-us-selection.png',
      mimeType: 'image/png',
      byteSize: 1,
    },
  });
  if (protoCap.created) {
    createdSystemIds.push(protoCap.systemId);
    createdAssetIds.push(protoCapAssetId);
  }

  const oria = await bootstrapOriaDomain(db, {
    media: {
      id: oriaAssetId,
      storageKey: 'qualification/work-with-us-selection/oria.webp',
      originalFilename: 'oria-work-with-us-selection.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });
  if (oria.created) {
    createdSystemIds.push(oria.systemId);
    createdAssetIds.push(oriaAssetId);
  }

  const tugeres = await bootstrapTugeresDomain(db, {
    media: {
      id: tugeresAssetId,
      storageKey: 'qualification/work-with-us-selection/tugeres.webp',
      originalFilename: 'tugeres-work-with-us-selection.webp',
      mimeType: 'image/webp',
      byteSize: 1,
    },
  });
  if (tugeres.created) {
    createdSystemIds.push(tugeres.systemId);
    createdAssetIds.push(tugeresAssetId);
  }

  const lastSystem = await db
    .selectFrom('systems')
    .select('editorial_position')
    .orderBy('editorial_position', 'desc')
    .executeTakeFirst();
  const fixturePosition = (lastSystem?.editorial_position ?? -1) + 1;

  await db
    .insertInto('systems')
    .values([
      {
        id: localePartialSystemId,
        editorial_position: fixturePosition,
      },
      {
        id: overflowSystemId,
        editorial_position: fixturePosition + 1,
      },
    ])
    .execute();

  const fixtureSlug = `selection-fixture-${localePartialSystemId.slice(0, 8)}`;
  const now = new Date();
  await db
    .insertInto('system_publications')
    .values({
      system_id: localePartialSystemId,
      locale: 'en',
      slug: fixtureSlug,
      snapshot: {
        version: 1,
        systemId: localePartialSystemId,
        locale: 'en',
        presentationKind: 'standard',
        evidencePolicy: 'standard',
        slug: fixtureSlug,
        title: 'Locale-partial System',
        summary: 'Published in English only for Work with us selection qualification.',
        proofTransparency: {
          role: 'Qualification System',
          maturity: 'Inspectable fixture',
          demoNature: 'No demo',
          dataNature: 'Synthetic qualification data',
          limits: 'Qualification fixture only.',
        },
        presentationDocument: {},
        technologies: [],
        origin: null,
        links: [],
        media: [],
      },
      published_at: now,
      updated_at: now,
    })
    .execute();

  await db
    .insertInto('work_with_us_systems')
    .values([
      { page_id: pageId, system_id: protoCap.systemId, position: 0 },
      { page_id: pageId, system_id: localePartialSystemId, position: 1 },
      { page_id: pageId, system_id: tugeres.systemId, position: 2 },
      { page_id: pageId, system_id: oria.systemId, position: 3 },
    ])
    .execute();

  const english = await listWorkWithUsProofReferences(db, 'en');
  assert.deepEqual(
    english.map(({ slug }) => slug),
    ['protocap', fixtureSlug, 'tugeres', 'oria-nutrition'],
    'Public Work with us references must follow the administrated relation order.',
  );

  const french = await listWorkWithUsProofReferences(db, 'fr');
  assert.deepEqual(
    french.map(({ slug }) => slug),
    ['protocap', 'tugeres', 'oria-nutrition'],
    'A selected System without a publication in the current locale must be omitted without disturbing the remaining order.',
  );

  await assert.rejects(
    () =>
      db
        .insertInto('work_with_us_systems')
        .values({
          page_id: pageId,
          system_id: overflowSystemId,
          position: 4,
        })
        .execute(),
    /work_with_us_systems_position_check/,
    'The database must make a fifth Work with us System impossible.',
  );

  process.stdout.write(
    'Work with us System selection qualification passed: selection is data-owned, ordered, capped at four, and locale-unpublished Systems are omitted from public references.\n',
  );
} finally {
  await db
    .deleteFrom('work_with_us_systems')
    .where('page_id', '=', pageId)
    .execute();

  if (previousSelections.length > 0) {
    await db
      .insertInto('work_with_us_systems')
      .values(
        previousSelections.map((selection) => ({
          page_id: pageId,
          system_id: selection.system_id,
          position: selection.position,
        })),
      )
      .execute();
  }

  if (createdPage) {
    await db
      .deleteFrom('work_with_us_pages')
      .where('id', '=', pageId)
      .execute();
  }

  await db
    .deleteFrom('system_publications')
    .where('system_id', '=', localePartialSystemId)
    .execute();
  await db
    .deleteFrom('systems')
    .where('id', 'in', [localePartialSystemId, overflowSystemId])
    .execute();

  if (createdSystemIds.length > 0) {
    await db.deleteFrom('systems').where('id', 'in', createdSystemIds).execute();
  }
  if (createdAssetIds.length > 0) {
    await db.deleteFrom('assets').where('id', 'in', createdAssetIds).execute();
  }
  await db.destroy();
}
