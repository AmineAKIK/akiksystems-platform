import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createDatabase } from '../database.js';
import {
  getPublishedTraining,
  listPublishedTrainings,
  publishTrainingLocalization,
  unpublishTrainingLocalization,
} from '../training-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
const firstId = randomUUID();
const secondId = randomUUID();

try {
  await db.insertInto('trainings').values([
    { id: firstId, provider: 'Qualification Provider', state: 'completed', start_date: '2025-01-01', end_date: '2025-06-30', editorial_position: 1 },
    { id: secondId, provider: 'Second Provider', state: 'in_progress', start_date: '2026-01-01', end_date: null, editorial_position: 0 },
  ]).execute();

  await db.insertInto('training_localizations').values([
    { training_id: firstId, locale: 'en', slug: 'qualified-training', title: 'Qualified Training', summary: 'Published Training context.', body: 'Context at inspection depth.' },
    { training_id: firstId, locale: 'fr', slug: 'formation-qualifiee', title: 'Formation qualifiée', summary: 'Contexte de formation publié.', body: 'Contexte au niveau inspection.' },
    { training_id: secondId, locale: 'en', slug: 'second-training', title: 'Second Training', summary: 'Ordering qualification.' },
    { training_id: secondId, locale: 'fr' },
  ]).execute();

  await publishTrainingLocalization(db, { trainingId: firstId, locale: 'en' });
  await publishTrainingLocalization(db, { trainingId: firstId, locale: 'fr' });
  await publishTrainingLocalization(db, { trainingId: secondId, locale: 'en' });

  const ordered = await listPublishedTrainings(db, 'en');
  assert.deepEqual(ordered.map((item) => item.trainingId), [secondId, firstId]);

  const english = await getPublishedTraining(db, { locale: 'en', slug: 'qualified-training' });
  assert.ok(english);
  assert.equal(english.provider, 'Qualification Provider');
  assert.equal(english.alternate?.slug, 'formation-qualifiee');

  await db.updateTable('training_localizations').set({
    title: 'Draft changed title',
    summary: 'Draft changed summary.',
    editorial_state: 'draft',
    published_at: null,
    updated_at: new Date(),
  }).where('training_id', '=', firstId).where('locale', '=', 'en').execute();

  const stablePublic = await getPublishedTraining(db, { locale: 'en', slug: 'qualified-training' });
  assert.equal(stablePublic?.title, 'Qualified Training');
  assert.equal(stablePublic?.summary, 'Published Training context.');

  await unpublishTrainingLocalization(db, { trainingId: firstId, locale: 'fr' });
  assert.equal((await getPublishedTraining(db, { locale: 'en', slug: 'qualified-training' }))?.alternate, null);
  assert.equal(await getPublishedTraining(db, { locale: 'fr', slug: 'formation-qualifiee' }), null);

  await assert.rejects(
    db.insertInto('trainings').values({
      id: randomUUID(), provider: 'Bad Dates', state: 'planned',
      start_date: '2026-06-01', end_date: '2026-05-01', editorial_position: 5,
    }).execute(),
  );

  process.stdout.write('AKS-087 Training domain qualification passed.\n');
} finally {
  await db.deleteFrom('trainings').where('id', 'in', [firstId, secondId]).execute();
  await db.destroy();
}
