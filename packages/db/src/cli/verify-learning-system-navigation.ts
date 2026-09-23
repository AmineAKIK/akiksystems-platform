import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { bootstrapDwwmTraining } from '../dwwm-bootstrap.js';
import { createDatabase } from '../database.js';
import {
  listPublishedLearningArtifactsForSystem,
  publishLearningArtifactLocalization,
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
        ? 'Système publié pour qualifier la navigation Learning.'
        : 'Published System for Learning navigation qualification.',
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
          id: 'learning-navigation-qualification',
          type: 'paragraph',
          text: 'Learning navigation qualification reference.',
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

  const dossier = await bootstrapSentinelDossier(db);
  learningArtifactId = dossier.learningArtifactId;

  const [english, french, unrelated] = await Promise.all([
    listPublishedLearningArtifactsForSystem(db, {
      locale: 'en',
      systemId,
    }),
    listPublishedLearningArtifactsForSystem(db, {
      locale: 'fr',
      systemId,
    }),
    listPublishedLearningArtifactsForSystem(db, {
      locale: 'en',
      systemId: randomUUID(),
    }),
  ]);

  assert.deepEqual(
    english.map((artifact) => ({
      slug: artifact.slug,
      title: artifact.title,
    })),
    [
      {
        slug: 'sentinel-dwwm-project-dossier',
        title: 'Sentinel — DWWM Project Dossier',
      },
    ],
  );
  assert.deepEqual(
    french.map((artifact) => ({
      slug: artifact.slug,
      title: artifact.title,
    })),
    [
      {
        slug: 'dossier-projet-dwwm-sentinel',
        title: 'Sentinel — dossier de projet DWWM',
      },
    ],
  );
  assert.deepEqual(unrelated, []);

  await db
    .updateTable('learning_artifacts')
    .set({ system_id: null, updated_at: new Date() })
    .where('id', '=', learningArtifactId)
    .execute();

  const [englishBeforeRepublish, frenchBeforeRepublish] = await Promise.all([
    listPublishedLearningArtifactsForSystem(db, {
      locale: 'en',
      systemId,
    }),
    listPublishedLearningArtifactsForSystem(db, {
      locale: 'fr',
      systemId,
    }),
  ]);
  assert.equal(
    englishBeforeRepublish.length,
    1,
    'Draft relation changes must not alter the EN public System evidence list.',
  );
  assert.equal(
    frenchBeforeRepublish.length,
    1,
    'Draft relation changes must not alter the FR public System evidence list.',
  );

  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });

  const [englishAfterRepublish, frenchAfterEnglishRepublish] =
    await Promise.all([
      listPublishedLearningArtifactsForSystem(db, {
        locale: 'en',
        systemId,
      }),
      listPublishedLearningArtifactsForSystem(db, {
        locale: 'fr',
        systemId,
      }),
    ]);

  assert.deepEqual(
    englishAfterRepublish,
    [],
    'Republishing EN after unlinking must remove only the EN System -> Learning relation.',
  );
  assert.equal(
    frenchAfterEnglishRepublish.length,
    1,
    'EN republish must not mutate the still-published FR relation snapshot.',
  );

  process.stdout.write(
    'AKS-096 Learning/System navigation qualification passed: published Learning evidence is bilingual, System-addressable, and snapshot-safe across draft relation changes and independent locale republishing.\n',
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
