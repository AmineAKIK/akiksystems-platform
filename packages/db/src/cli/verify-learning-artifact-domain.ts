import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedLearningArtifact,
  listPublishedLearningArtifacts,
  listPublishedLearningArtifactsForTraining,
  publishLearningArtifactLocalization,
  unpublishLearningArtifactLocalization,
} from '../learning-artifact-publication.js';
import { publishTrainingLocalization } from '../training-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const trainingId = randomUUID();
const systemId = randomUUID();
const assetId = randomUUID();
const learningArtifactId = randomUUID();

const systemSnapshot = {
  version: 1,
  systemId,
  locale: 'en',
  presentationKind: 'standard',
  evidencePolicy: 'all_supported',
  slug: 'artifact-system',
  title: 'Artifact System',
  summary: 'Published System context for LearningArtifact qualification.',
  proofTransparency: {
    role: 'Implemented by Amine.',
    maturity: 'Qualified reference.',
    demoNature: 'No demo required.',
    dataNature: 'Synthetic qualification data.',
    limits: 'Qualification-only System.',
  },
  presentationDocument: {
    version: 1,
    blocks: [
      {
        id: 'artifact-system-intro',
        type: 'paragraph',
        text: 'Qualification System presentation.',
      },
    ],
  },
  technologies: [],
  origin: null,
  links: [],
  media: [],
} as const;

try {
  await db
    .insertInto('trainings')
    .values({
      id: trainingId,
      provider: 'LearningArtifact Qualification Provider',
      state: 'completed',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      editorial_position: 0,
    })
    .execute();

  await db
    .insertInto('training_localizations')
    .values([
      {
        training_id: trainingId,
        locale: 'en',
        slug: 'artifact-training',
        title: 'Artifact Training',
        summary: 'Training context for LearningArtifact qualification.',
      },
      {
        training_id: trainingId,
        locale: 'fr',
        slug: 'formation-preuve',
        title: 'Formation de preuve',
        summary: 'Contexte de formation pour la qualification LearningArtifact.',
      },
    ])
    .execute();

  await publishTrainingLocalization(db, { trainingId, locale: 'en' });
  await publishTrainingLocalization(db, { trainingId, locale: 'fr' });

  await db.insertInto('systems').values({ id: systemId }).execute();
  await db
    .insertInto('system_publications')
    .values({
      system_id: systemId,
      locale: 'en',
      slug: 'artifact-system',
      snapshot: systemSnapshot as unknown as Record<string, unknown>,
      published_at: new Date(),
      updated_at: new Date(),
    })
    .execute();

  await db
    .insertInto('assets')
    .values({
      id: assetId,
      storage_key: `qualification/learning-artifacts/${assetId}.pdf`,
      original_filename: 'learning-artifact-source.pdf',
      mime_type: 'application/pdf',
      byte_size: 4096,
      width: null,
      height: null,
    })
    .execute();

  await db
    .insertInto('learning_artifacts')
    .values({
      id: learningArtifactId,
      training_id: trainingId,
      system_id: systemId,
      source_asset_id: assetId,
      editorial_position: 0,
    })
    .execute();

  await db
    .insertInto('learning_artifact_localizations')
    .values([
      {
        learning_artifact_id: learningArtifactId,
        locale: 'en',
        slug: 'qualified-learning-artifact',
        title: 'Qualified Learning Artifact',
        summary: 'Published first-class learning evidence.',
        body: 'Inspection depth for the learning evidence.',
      },
      {
        learning_artifact_id: learningArtifactId,
        locale: 'fr',
        slug: 'preuve-apprentissage-qualifiee',
        title: 'Preuve d’apprentissage qualifiée',
        summary: 'Preuve d’apprentissage de premier rang publiée.',
        body: 'Niveau d’inspection de la preuve d’apprentissage.',
      },
    ])
    .execute();

  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });
  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'fr',
  });

  const english = await getPublishedLearningArtifact(db, {
    locale: 'en',
    slug: 'qualified-learning-artifact',
  });
  assert.ok(english);
  assert.equal(english.training?.trainingId, trainingId);
  assert.equal(english.training?.slug, 'artifact-training');
  assert.equal(english.system?.systemId, systemId);
  assert.equal(english.system?.href, '/en/systems/artifact-system');
  assert.equal(english.sourceAssetId, assetId);
  assert.equal(english.alternate?.slug, 'preuve-apprentissage-qualifiee');

  const listed = await listPublishedLearningArtifacts(db, 'en');
  assert.deepEqual(
    listed.map((artifact) => artifact.learningArtifactId),
    [learningArtifactId],
  );

  const connected = await listPublishedLearningArtifactsForTraining(db, {
    locale: 'en',
    trainingId,
  });
  assert.deepEqual(
    connected.map((artifact) => artifact.learningArtifactId),
    [learningArtifactId],
  );

  await db
    .updateTable('learning_artifact_localizations')
    .set({
      title: 'Draft changed artifact',
      summary: 'Draft changed summary.',
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('learning_artifact_id', '=', learningArtifactId)
    .where('locale', '=', 'en')
    .execute();

  const stablePublic = await getPublishedLearningArtifact(db, {
    locale: 'en',
    slug: 'qualified-learning-artifact',
  });
  assert.equal(stablePublic?.title, 'Qualified Learning Artifact');
  assert.equal(
    stablePublic?.summary,
    'Published first-class learning evidence.',
  );

  await assert.rejects(
    db.deleteFrom('trainings').where('id', '=', trainingId).execute(),
    'A Training with first-class LearningArtifact evidence must not be deletable.',
  );

  await unpublishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'fr',
  });
  assert.equal(
    (
      await getPublishedLearningArtifact(db, {
        locale: 'en',
        slug: 'qualified-learning-artifact',
      })
    )?.alternate,
    null,
  );
  assert.equal(
    await getPublishedLearningArtifact(db, {
      locale: 'fr',
      slug: 'preuve-apprentissage-qualifiee',
    }),
    null,
  );

  await db
    .updateTable('learning_artifacts')
    .set({ system_id: null, source_asset_id: null, updated_at: new Date() })
    .where('id', '=', learningArtifactId)
    .execute();
  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });

  const optionalLinks = await getPublishedLearningArtifact(db, {
    locale: 'en',
    slug: 'qualified-learning-artifact',
  });
  assert.equal(optionalLinks?.systemId, null);
  assert.equal(optionalLinks?.system, null);
  assert.equal(optionalLinks?.sourceAssetId, null);
  assert.equal(optionalLinks?.training?.trainingId, trainingId);

  await db
    .updateTable('learning_artifacts')
    .set({ training_id: null, updated_at: new Date() })
    .where('id', '=', learningArtifactId)
    .execute();

  const relationBeforeRepublish = await listPublishedLearningArtifactsForTraining(db, {
    locale: 'en',
    trainingId,
  });
  assert.deepEqual(
    relationBeforeRepublish.map((artifact) => artifact.learningArtifactId),
    [learningArtifactId],
    'Draft LearningArtifact relationship changes must not leak into the published Training surface.',
  );

  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });

  const standalone = await getPublishedLearningArtifact(db, {
    locale: 'en',
    slug: 'qualified-learning-artifact',
  });
  assert.equal(standalone?.trainingId, null);
  assert.equal(standalone?.training, null);

  const noLongerConnected = await listPublishedLearningArtifactsForTraining(db, {
    locale: 'en',
    trainingId,
  });
  assert.deepEqual(noLongerConnected, []);

  await db.deleteFrom('trainings').where('id', '=', trainingId).execute();

  process.stdout.write(
    'AKS-089/100 LearningArtifact domain qualification passed: Training context is optional but explicit, System/source evidence stays optional, bilingual publication snapshots remain stable, and standalone evidence can publish without inventing a Training.\n',
  );
} finally {
  await db
    .deleteFrom('learning_artifacts')
    .where('id', '=', learningArtifactId)
    .execute();
  await db.deleteFrom('assets').where('id', '=', assetId).execute();
  await db
    .deleteFrom('system_publications')
    .where('system_id', '=', systemId)
    .execute();
  await db.deleteFrom('systems').where('id', '=', systemId).execute();
  await db.deleteFrom('trainings').where('id', '=', trainingId).execute();
  await db.destroy();
}
