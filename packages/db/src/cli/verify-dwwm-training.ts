import assert from 'node:assert/strict';

import { createDatabase } from '../database.js';
import { bootstrapDwwmTraining } from '../dwwm-bootstrap.js';
import { getPublishedTraining } from '../training-publication.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const db = createDatabase(connectionString);
let trainingId: string | null = null;

try {
  const first = await bootstrapDwwmTraining(db);
  trainingId = first.trainingId;
  assert.equal(first.created, true);

  const repeated = await bootstrapDwwmTraining(db);
  assert.deepEqual(repeated, { created: false, trainingId });

  const [english, french, shared] = await Promise.all([
    getPublishedTraining(db, {
      locale: 'en',
      slug: 'full-stack-web-mobile-developer',
    }),
    getPublishedTraining(db, {
      locale: 'fr',
      slug: 'developpeur-web-web-mobile',
    }),
    db
      .selectFrom('trainings')
      .select([
        'provider',
        'state',
        'start_date',
        'end_date',
      ])
      .where('id', '=', trainingId)
      .executeTakeFirstOrThrow(),
  ]);

  assert.ok(english);
  assert.ok(french);
  assert.equal(shared.provider, 'STUDI');
  assert.equal(shared.state, 'in_progress');
  assert.equal(shared.start_date, null);
  assert.equal(shared.end_date, null);

  assert.equal(
    english.title,
    'Full-Stack Web & Mobile Developer — Professional Title RNCP 37674',
  );
  assert.match(english.summary, /STUDI training currently in progress/);
  assert.match(english.body ?? '', /Professional Title RNCP 37674/);
  assert.equal(english.alternate?.slug, 'developpeur-web-web-mobile');

  assert.equal(
    french.title,
    'Développeur web et web mobile — Titre professionnel RNCP 37674',
  );
  assert.match(french.summary, /Formation STUDI actuellement en cours/);
  assert.match(french.body ?? '', /titre professionnel RNCP 37674/);
  assert.equal(french.alternate?.slug, 'full-stack-web-mobile-developer');

  process.stdout.write(
    'AKS-092 DWWM Training qualification passed: real STUDI/RNCP 37674 metadata, in-progress state, intentionally unspecified dates, bilingual publication, deep links, and idempotent provisioning are enforced.\n',
  );
} finally {
  if (trainingId !== null) {
    await db.deleteFrom('trainings').where('id', '=', trainingId).execute();
  }
  await db.destroy();
}
