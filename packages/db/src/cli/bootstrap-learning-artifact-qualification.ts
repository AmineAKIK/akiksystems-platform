import { createDatabase } from '../database.js';
import { publishLearningArtifactLocalization } from '../learning-artifact-publication.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const trainingId = '7f1b4863-e676-4d55-a0b8-3f8e8b1a8707';
const learningArtifactId = '9af06465-d8c9-4b34-b6bc-0dc8e51d64b4';

try {
  const sentinel = await db
    .selectFrom('system_publications')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'sentinel')
    .executeTakeFirst();

  if (sentinel === undefined) {
    throw new Error(
      'Sentinel must be published before LearningArtifact browser qualification.',
    );
  }

  await db
    .insertInto('learning_artifacts')
    .values({
      id: learningArtifactId,
      training_id: trainingId,
      system_id: sentinel.system_id,
      source_asset_id: null,
      editorial_position: 0,
    })
    .onConflict((conflict) =>
      conflict.column('id').doUpdateSet({
        training_id: trainingId,
        system_id: sentinel.system_id,
        source_asset_id: null,
        editorial_position: 0,
        updated_at: new Date(),
      }),
    )
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
        body:
          'This evidence remains distinct from its Training context while staying directly inspectable.',
        editorial_state: 'draft',
        published_at: null,
      },
      {
        learning_artifact_id: learningArtifactId,
        locale: 'fr',
        slug: 'preuve-apprentissage-qualifiee',
        title: 'Preuve d’apprentissage qualifiée',
        summary: 'Preuve d’apprentissage de premier rang publiée.',
        body:
          'Cette preuve reste distincte de son contexte de formation tout en restant directement inspectable.',
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .onConflict((conflict) =>
      conflict
        .columns(['learning_artifact_id', 'locale'])
        .doUpdateSet((eb) => ({
          slug: eb.ref('excluded.slug'),
          title: eb.ref('excluded.title'),
          summary: eb.ref('excluded.summary'),
          body: eb.ref('excluded.body'),
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })),
    )
    .execute();

  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });
  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'fr',
  });

  process.stdout.write(
    `LearningArtifact browser qualification bootstrap published EN/FR artifact ${learningArtifactId} linked to Sentinel.\n`,
  );
} finally {
  await db.destroy();
}
