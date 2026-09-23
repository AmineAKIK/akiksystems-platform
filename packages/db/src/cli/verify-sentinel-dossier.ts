import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { bootstrapDwwmTraining } from '../dwwm-bootstrap.js';
import { createDatabase } from '../database.js';
import {
  getPublishedLearningArtifact,
  listPublishedLearningArtifactsForTraining,
} from '../learning-artifact-publication.js';
import { bootstrapSentinelDossier } from '../sentinel-dossier-bootstrap.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const systemId = randomUUID();
let trainingId: string | null = null;
let learningArtifactId: string | null = null;

function systemSnapshot(locale: 'en' | 'fr') {
  return {
    version: 1,
    systemId,
    locale,
    presentationKind: 'standard',
    evidencePolicy: 'all_supported',
    slug: 'sentinel',
    title: 'Sentinel',
    summary:
      locale === 'fr'
        ? 'Système publié pour la qualification du dossier DWWM.'
        : 'Published System for DWWM dossier qualification.',
    proofTransparency: {
      role: 'Implemented by Amine.',
      maturity: 'Published reference.',
      demoNature: 'Publicly inspectable System.',
      dataNature: 'Qualification data.',
      limits: 'Qualification-only snapshot.',
    },
    presentationDocument: {
      version: 1,
      blocks: [
        {
          id: 'sentinel-dossier-qualification',
          type: 'paragraph',
          text: 'Sentinel qualification reference.',
        },
      ],
    },
    technologies: [],
    origin: null,
    links: [],
    media: [],
  };
}

function assertNativeSections(
  body: string | null,
  headings: readonly string[],
): void {
  assert.ok(body);
  assert.equal(
    body.match(/^## /gm)?.length,
    headings.length,
    'The dossier body must expose exactly the native Web section contract.',
  );

  for (const heading of headings) {
    assert.match(body, new RegExp('^## ' + heading + '$', 'm'));
  }
}

try {
  const training = await bootstrapDwwmTraining(db);
  trainingId = training.trainingId;

  await db.insertInto('systems').values({ id: systemId }).execute();
  const now = new Date();
  await db
    .insertInto('system_publications')
    .values([
      {
        system_id: systemId,
        locale: 'en',
        slug: 'sentinel',
        snapshot: systemSnapshot('en') as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      },
      {
        system_id: systemId,
        locale: 'fr',
        slug: 'sentinel',
        snapshot: systemSnapshot('fr') as unknown as Record<string, unknown>,
        published_at: now,
        updated_at: now,
      },
    ])
    .execute();

  const first = await bootstrapSentinelDossier(db);
  learningArtifactId = first.learningArtifactId;
  assert.equal(first.created, true);
  assert.equal(first.trainingId, trainingId);
  assert.equal(first.systemId, systemId);

  const repeated = await bootstrapSentinelDossier(db);
  assert.deepEqual(repeated, {
    created: false,
    learningArtifactId,
    trainingId,
    systemId,
  });

  const artifactCount = await db
    .selectFrom('learning_artifacts')
    .select(({ fn }) => fn.countAll<number>().as('count'))
    .where('id', '=', learningArtifactId)
    .executeTakeFirstOrThrow();
  assert.equal(Number(artifactCount.count), 1);

  const [english, french] = await Promise.all([
    getPublishedLearningArtifact(db, {
      locale: 'en',
      slug: 'sentinel-dwwm-project-dossier',
    }),
    getPublishedLearningArtifact(db, {
      locale: 'fr',
      slug: 'dossier-projet-dwwm-sentinel',
    }),
  ]);

  assert.ok(english);
  assert.ok(french);

  assert.equal(english.training?.trainingId, trainingId);
  assert.equal(english.training?.slug, 'full-stack-web-mobile-developer');
  assert.equal(english.system?.systemId, systemId);
  assert.equal(english.system?.href, '/en/systems/sentinel');
  assert.equal(english.sourceAssetId, null);
  assert.equal(english.alternate?.slug, 'dossier-projet-dwwm-sentinel');
  assert.match(english.body ?? '', /v1\.0\.0-rc\.9/);
  assert.match(
    english.body ?? '',
    /This Web presentation does not claim that the final submitted PDF is already attached/,
  );
  assertNativeSections(english.body, [
    'Context',
    'Objectives',
    'Architecture',
    'Design choices',
    'Security',
    'Tests',
    'Difficulties',
    'Results',
    'Limits',
    'Evidence',
  ]);

  assert.equal(french.training?.trainingId, trainingId);
  assert.equal(french.training?.slug, 'developpeur-web-web-mobile');
  assert.equal(french.system?.systemId, systemId);
  assert.equal(french.system?.href, '/fr/systems/sentinel');
  assert.equal(french.sourceAssetId, null);
  assert.equal(french.alternate?.slug, 'sentinel-dwwm-project-dossier');
  assert.match(french.body ?? '', /ed26a25e3c005cabb0da30a4553dfbbee03afe81/);
  assert.match(
    french.body ?? '',
    /Cette présentation Web ne prétend pas que le PDF final remis est déjà joint/,
  );
  assertNativeSections(french.body, [
    'Contexte',
    'Objectifs',
    'Architecture',
    'Choix de conception',
    'Sécurité',
    'Tests',
    'Difficultés',
    'Résultats',
    'Limites',
    'Preuves',
  ]);

  const connected = await listPublishedLearningArtifactsForTraining(db, {
    locale: 'en',
    trainingId,
  });
  assert.ok(
    connected.some(
      (artifact) => artifact.learningArtifactId === learningArtifactId,
    ),
  );

  process.stdout.write(
    'AKS-093/094 Sentinel dossier qualification passed: verified dossier context is bilingual, deep-linkable, connected to the real DWWM Training and Sentinel System, idempotent, structured into the ten native Web reading sections, and explicitly keeps the source PDF out of scope.\n',
  );
} finally {
  if (learningArtifactId !== null) {
    await db
      .deleteFrom('learning_artifacts')
      .where('id', '=', learningArtifactId)
      .execute();
  }
  await db
    .deleteFrom('system_publications')
    .where('system_id', '=', systemId)
    .execute();
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  if (trainingId !== null) {
    await db.deleteFrom('trainings').where('id', '=', trainingId).execute();
  }
  await db.destroy();
}
