import { createDatabase } from '../database.js';
import { publishTrainingLocalization } from '../training-publication.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const trainingId = '7f1b4863-e676-4d55-a0b8-3f8e8b1a8707';

try {
  await db
    .insertInto('trainings')
    .values({
      id: trainingId,
      provider: 'Qualification Provider',
      state: 'completed',
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      editorial_position: 0,
    })
    .onConflict((conflict) =>
      conflict.column('id').doUpdateSet({
        provider: 'Qualification Provider',
        state: 'completed',
        start_date: '2025-01-01',
        end_date: '2025-06-30',
        editorial_position: 0,
        updated_at: new Date(),
      }),
    )
    .execute();

  await db
    .insertInto('training_localizations')
    .values([
      {
        training_id: trainingId,
        locale: 'en',
        slug: 'qualified-training',
        title: 'Qualified Training',
        summary: 'Published Training context.',
        body: 'Training provides the context for inspectable learning evidence.',
        editorial_state: 'draft',
        published_at: null,
      },
      {
        training_id: trainingId,
        locale: 'fr',
        slug: 'formation-qualifiee',
        title: 'Formation qualifiée',
        summary: 'Contexte de formation publié.',
        body: 'La formation fournit le contexte des preuves d’apprentissage inspectables.',
        editorial_state: 'draft',
        published_at: null,
      },
    ])
    .onConflict((conflict) =>
      conflict.columns(['training_id', 'locale']).doUpdateSet((eb) => ({
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

  await publishTrainingLocalization(db, { trainingId, locale: 'en' });
  await publishTrainingLocalization(db, { trainingId, locale: 'fr' });

  process.stdout.write(
    `Training browser qualification bootstrap published EN/FR Training ${trainingId}.\n`,
  );
} finally {
  await db.destroy();
}
