import {
  bootstrapSentinelSystemDraft,
  createDatabase,
  publishSystemLocalization,
} from '../index.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const sentinel = await bootstrapSentinelSystemDraft(db);

  await db
    .updateTable('system_localizations')
    .set({
      summary:
        'Operational visibility built from industrial context and inspectable evidence.',
      presentation_document: {
        version: 1,
        blocks: [
          {
            type: 'paragraph',
            text: 'Sentinel turns operational signals into a calm, inspectable system.',
          },
        ],
      },
      editorial_state: 'draft',
      published_at: null,
      updated_at: new Date(),
    })
    .where('system_id', '=', sentinel.systemId)
    .where('locale', '=', 'en')
    .execute();

  await publishSystemLocalization(db, {
    systemId: sentinel.systemId,
    locale: 'en',
  });

  process.stdout.write(
    `Sentinel performance fixture published for ${sentinel.systemId}.\n`,
  );
} finally {
  await db.destroy();
}
