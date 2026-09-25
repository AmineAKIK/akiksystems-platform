import {
  bootstrapSentinelSystemDraft,
  createDatabase,
  publishSystemLocalization,
} from '../index.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const sentinel = await bootstrapSentinelSystemDraft(db);

  const localizations = {
    en: {
      summary:
        'Operational visibility built from industrial context and inspectable evidence.',
      presentation:
        'Sentinel turns operational signals into a calm, inspectable system.',
    },
    fr: {
      summary:
        'Visibilité opérationnelle issue d’un contexte industriel et de preuves inspectables.',
      presentation:
        'Sentinel transforme les signaux opérationnels en un système calme et inspectable.',
    },
  } as const;

  for (const locale of ['en', 'fr'] as const) {
    const content = localizations[locale];
    await db
      .updateTable('system_localizations')
      .set({
        summary: content.summary,
        presentation_document: {
          version: 1,
          blocks: [
            {
              type: 'paragraph',
              text: content.presentation,
            },
          ],
        },
        editorial_state: 'draft',
        published_at: null,
        updated_at: new Date(),
      })
      .where('system_id', '=', sentinel.systemId)
      .where('locale', '=', locale)
      .execute();

    await publishSystemLocalization(db, {
      systemId: sentinel.systemId,
      locale,
    });
  }

  process.stdout.write(
    `Sentinel CI fixture published in EN/FR for ${sentinel.systemId}.\n`,
  );
} finally {
  await db.destroy();
}
