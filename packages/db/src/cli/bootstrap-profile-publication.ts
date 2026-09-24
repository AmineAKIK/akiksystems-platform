import { createDatabase } from '../database.js';
import { bootstrapInitialProfile } from '../profile-initial-bootstrap.js';
import { getDraftProfile } from '../public-profile.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const initial = await bootstrapInitialProfile(db);
  if (initial.updatedDraft || initial.publishedLocales.length > 0) {
    process.stdout.write(
      `Initial Profile bootstrap prepared ${initial.profileId}; published ${initial.publishedLocales.map((locale) => locale.toUpperCase()).join(', ') || 'no new locale'}.\n`,
    );
  }

  const profile = await db
    .selectFrom('profiles')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  if (profile === undefined) {
    process.stdout.write('Profile publication bootstrap skipped: no public Profile exists.\n');
    process.exitCode = 0;
  } else {
    for (const locale of ['en', 'fr'] as const) {
      const existing = await db
        .selectFrom('profile_publications')
        .select('profile_id')
        .where('profile_id', '=', profile.id)
        .where('locale', '=', locale)
        .executeTakeFirst();

      if (existing !== undefined) continue;

      const draft = await getDraftProfile(db, locale);
      if (
        draft === null ||
        draft.displayName === null ||
        draft.professionalTitle === null ||
        draft.introduction === null
      ) {
        process.stdout.write(
          `Profile publication bootstrap skipped for ${locale.toUpperCase()}: required public identity is incomplete.\n`,
        );
        continue;
      }

      await db
        .insertInto('profile_publications')
        .values({
          profile_id: profile.id,
          locale,
          snapshot: draft as unknown as Record<string, unknown>,
          published_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      process.stdout.write(
        `Profile publication bootstrap created ${locale.toUpperCase()} snapshot.\n`,
      );
    }
  }
} finally {
  await db.destroy();
}
