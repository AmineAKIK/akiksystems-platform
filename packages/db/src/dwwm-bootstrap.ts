import { randomUUID } from 'node:crypto';

import type { Kysely } from 'kysely';

import { publishTrainingLocalization } from './training-publication.js';
import type { Database } from './schema.js';

export interface BootstrapDwwmTrainingResult {
  created: boolean;
  trainingId: string;
}

export async function bootstrapDwwmTraining(
  db: Kysely<Database>,
): Promise<BootstrapDwwmTrainingResult> {
  const existing = await db
    .selectFrom('training_localizations')
    .select('training_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'full-stack-web-mobile-developer')
    .executeTakeFirst();

  if (existing !== undefined) {
    return { created: false, trainingId: existing.training_id };
  }

  const trainingId = randomUUID();
  const publishedAt = new Date();

  await db.transaction().execute(async (transaction) => {
    const maxPosition = await transaction
      .selectFrom('trainings')
      .select(({ fn }) =>
        fn.max<number>('editorial_position').as('max_position'),
      )
      .executeTakeFirst();

    await transaction
      .insertInto('trainings')
      .values({
        id: trainingId,
        provider: 'STUDI',
        state: 'in_progress',
        start_date: null,
        end_date: null,
        editorial_position: (maxPosition?.max_position ?? -1) + 1,
      })
      .execute();

    await transaction
      .insertInto('training_localizations')
      .values([
        {
          training_id: trainingId,
          locale: 'en',
          slug: 'full-stack-web-mobile-developer',
          title:
            'Full-Stack Web & Mobile Developer — Professional Title RNCP 37674',
          summary:
            'STUDI training currently in progress, providing the formal learning context for full-stack web and mobile development.',
          body:
            'This STUDI training prepares the Professional Title RNCP 37674. It provides the learning context for the web and mobile development work represented on AkikSystems. Credentials, project dossiers, and other learning evidence remain separate first-class objects and are linked when they are published.',
          editorial_state: 'published',
          published_at: publishedAt,
        },
        {
          training_id: trainingId,
          locale: 'fr',
          slug: 'developpeur-web-web-mobile',
          title:
            'Développeur web et web mobile — Titre professionnel RNCP 37674',
          summary:
            'Formation STUDI actuellement en cours, donnant le contexte d’apprentissage formel du développement web et web mobile.',
          body:
            'Cette formation STUDI prépare au titre professionnel RNCP 37674. Elle fournit le contexte d’apprentissage des travaux de développement web et mobile représentés sur AkikSystems. Les justificatifs, dossiers de projet et autres preuves d’apprentissage restent des objets de premier rang distincts, reliés lorsqu’ils sont publiés.',
          editorial_state: 'published',
          published_at: publishedAt,
        },
      ])
      .execute();
  });

  await publishTrainingLocalization(db, {
    trainingId,
    locale: 'en',
  });
  await publishTrainingLocalization(db, {
    trainingId,
    locale: 'fr',
  });

  return { created: true, trainingId };
}
