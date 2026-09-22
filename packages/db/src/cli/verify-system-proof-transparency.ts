import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { bootstrapOriaDomain } from '../oria-bootstrap.js';
import { bootstrapProtoCapDomain } from '../protocap-bootstrap.js';
import { getPublishedSystem } from '../public-system.js';
import { publishSystemLocalization } from '../system-publication.js';
import { bootstrapTugeresDomain } from '../tugeres-bootstrap.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';
import { createMigrator, reportMigrationResults } from './migrator.js';

const db = createDatabase(databaseUrlFromEnv());
const systemIds: string[] = [];
const assetIds: string[] = [];
const experienceIds: string[] = [];

function assertCompleteTransparency(
  system: Awaited<ReturnType<typeof getPublishedSystem>>,
  expected: RegExp[],
): void {
  assert.ok(system);
  const values = [
    system.proofTransparency.role,
    system.proofTransparency.maturity,
    system.proofTransparency.demoNature,
    system.proofTransparency.dataNature,
    system.proofTransparency.limits,
  ];

  assert.equal(values.length, 5);
  for (const value of values) {
    assert.ok(value.trim().length > 0);
  }

  const serialized = JSON.stringify(system.proofTransparency);
  for (const pattern of expected) {
    assert.match(serialized, pattern);
  }
}

try {
  const migrationResult = await createMigrator(db).migrateToLatest();
  reportMigrationResults(migrationResult.results);
  if (migrationResult.error !== undefined) throw migrationResult.error;

  const sentinelId = randomUUID();
  systemIds.push(sentinelId);
  await db
    .insertInto('systems')
    .values({ id: sentinelId, editorial_position: 50 })
    .execute();
  await db
    .insertInto('system_localizations')
    .values([
      {
        system_id: sentinelId,
        locale: 'en',
        slug: 'sentinel-transparency',
        title: 'Sentinel',
        summary: 'Operational visibility built from industrial context and inspectable evidence.',
        proof_role: 'Industrial-context software system',
        proof_maturity: 'Inspectable implementation',
        proof_demo_nature: 'No separate public demo',
        proof_data_nature: 'Real-world context; no customer data exposed',
        proof_limits: 'Origin context alone is not evidence of current deployment or publicly exposed operational data.',
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'Sentinel qualification.' }],
        },
        editorial_state: 'published',
        published_at: new Date(),
      },
      {
        system_id: sentinelId,
        locale: 'fr',
        slug: 'sentinel-transparence',
        title: 'Sentinel',
        summary: 'Visibilité opérationnelle issue d un contexte industriel et de preuves inspectables.',
        proof_role: 'Système logiciel issu d un contexte industriel',
        proof_maturity: 'Implémentation inspectable',
        proof_demo_nature: 'Aucune démo publique séparée',
        proof_data_nature: 'Contexte réel ; aucune donnée client exposée',
        proof_limits: 'Le contexte d origine ne constitue pas à lui seul une preuve de déploiement actuel ou de données opérationnelles publiques.',
        presentation_document: {
          version: 1,
          blocks: [{ type: 'paragraph', text: 'Qualification Sentinel.' }],
        },
        editorial_state: 'published',
        published_at: new Date(),
      },
    ])
    .execute();

  await publishSystemLocalization(db, { systemId: sentinelId, locale: 'en' });
  await publishSystemLocalization(db, { systemId: sentinelId, locale: 'fr' });

  const protoAssetId = randomUUID();
  assetIds.push(protoAssetId);
  const proto = await bootstrapProtoCapDomain(db, {
    media: {
      id: protoAssetId,
      storageKey: `qualification/transparency/protocap/${protoAssetId}.png`,
      originalFilename: 'protocap.png',
      mimeType: 'image/png',
      byteSize: 1024,
    },
  });
  systemIds.push(proto.systemId);

  const oriaAssetId = randomUUID();
  assetIds.push(oriaAssetId);
  const oria = await bootstrapOriaDomain(db, {
    media: {
      id: oriaAssetId,
      storageKey: `qualification/transparency/oria/${oriaAssetId}.webp`,
      originalFilename: 'oria.webp',
      mimeType: 'image/webp',
      byteSize: 1024,
    },
  });
  systemIds.push(oria.systemId);

  const tugeresAssetId = randomUUID();
  assetIds.push(tugeresAssetId);
  const tugeres = await bootstrapTugeresDomain(db, {
    media: {
      id: tugeresAssetId,
      storageKey: `qualification/transparency/tugeres/${tugeresAssetId}.webp`,
      originalFilename: 'tugeres.webp',
      mimeType: 'image/webp',
      byteSize: 1024,
    },
  });
  systemIds.push(tugeres.systemId);

  for (const locale of ['en', 'fr'] as const) {
    const sentinel = await getPublishedSystem(db, {
      locale,
      slug: locale === 'en' ? 'sentinel-transparency' : 'sentinel-transparence',
    });
    assertCompleteTransparency(
      sentinel,
      locale === 'en'
        ? [/Industrial-context software system/i, /Inspectable implementation/i, /no customer data/i]
        : [/contexte industriel/i, /Implémentation inspectable/i, /aucune donnée client/i],
    );

    const protoSystem = await getPublishedSystem(db, { locale, slug: 'protocap' });
    assertCompleteTransparency(
      protoSystem,
      locale === 'en'
        ? [/Engineering portfolio/i, /synthetic demonstration data/i, /No industrial deployment/i]
        : [/Portfolio d ingénierie/i, /Données de démonstration synthétiques/i, /Aucun déploiement industriel/i],
    );
    if (protoSystem?.origin?.id) experienceIds.push(protoSystem.origin.id);

    const oriaSystem = await getPublishedSystem(db, { locale, slug: 'oria-nutrition' });
    assertCompleteTransparency(
      oriaSystem,
      locale === 'en'
        ? [/non-industrial/i, /fictional/i, /not an operating nutrition practice/i]
        : [/non industrielle/i, /fictif/i, /ni un cabinet de nutrition/i],
    );

    const tugeresSystem = await getPublishedSystem(db, { locale, slug: 'tugeres' });
    assertCompleteTransparency(
      tugeresSystem,
      locale === 'en'
        ? [/White-label catering/i, /customer deployment not evidenced/i, /No supportable public demo/i]
        : [/white-label/i, /déploiement client actif non prouvé/i, /Aucune démo publique/i],
    );
  }

  process.stdout.write(
    'System proof transparency verification passed: Sentinel, ProtoCap, Oria, and Tugeres expose consistent localized role, maturity, demo nature, data nature, and limits.\n',
  );
} finally {
  if (systemIds.length > 0) {
    await db.deleteFrom('systems').where('id', 'in', [...new Set(systemIds)]).execute();
  }
  if (experienceIds.length > 0) {
    await db.deleteFrom('experiences').where('id', 'in', [...new Set(experienceIds)]).execute();
  }
  if (assetIds.length > 0) {
    await db.deleteFrom('assets').where('id', 'in', [...new Set(assetIds)]).execute();
  }
  await db.destroy();
}
