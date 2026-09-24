import type { Kysely } from 'kysely';

import { getDraftProfile } from './public-profile.js';
import type { Database } from './schema.js';

export const initialProfileSeed = {
  displayName: 'Amine AKIK',
  en: {
    professionalTitle: 'Software systems builder',
    introduction: 'I design and build inspectable software systems.',
    foundationalCopy:
      'This Profile connects professional identity to inspectable evidence without reproducing a CV.',
  },
  fr: {
    professionalTitle: 'Concepteur de systèmes logiciels',
    introduction: 'Je conçois et construis des systèmes logiciels inspectables.',
    foundationalCopy:
      'Ce Profil relie l’identité professionnelle à des preuves inspectables sans reproduire un CV.',
  },
} as const;

export interface BootstrapInitialProfileResult {
  profileId: string;
  updatedDraft: boolean;
  publishedLocales: Array<'en' | 'fr'>;
}

export async function bootstrapInitialProfile(
  db: Kysely<Database>,
): Promise<BootstrapInitialProfileResult> {
  const profile = await db
    .selectFrom('profiles')
    .select(['id', 'display_name'])
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();

  let updatedDraft = false;

  if (profile.display_name === null) {
    await db
      .updateTable('profiles')
      .set({
        display_name: initialProfileSeed.displayName,
        updated_at: new Date(),
      })
      .where('id', '=', profile.id)
      .execute();
    updatedDraft = true;
  }

  for (const locale of ['en', 'fr'] as const) {
    const seed = initialProfileSeed[locale];
    const localization = await db
      .selectFrom('profile_localizations')
      .select(['professional_title', 'introduction', 'foundational_copy'])
      .where('profile_id', '=', profile.id)
      .where('locale', '=', locale)
      .executeTakeFirstOrThrow();

    const updates: {
      professional_title?: string;
      introduction?: string;
      foundational_copy?: string;
      updated_at?: Date;
    } = {};

    if (localization.professional_title === null) {
      updates.professional_title = seed.professionalTitle;
    }
    if (localization.introduction === null) {
      updates.introduction = seed.introduction;
    }
    if (localization.foundational_copy === null) {
      updates.foundational_copy = seed.foundationalCopy;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await db
        .updateTable('profile_localizations')
        .set(updates)
        .where('profile_id', '=', profile.id)
        .where('locale', '=', locale)
        .execute();
      updatedDraft = true;
    }
  }

  const publishedLocales: Array<'en' | 'fr'> = [];

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
      throw new Error(
        `Initial Profile bootstrap could not satisfy publication readiness for ${locale.toUpperCase()}.`,
      );
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

    publishedLocales.push(locale);
  }

  return {
    profileId: profile.id,
    updatedDraft,
    publishedLocales,
  };
}
