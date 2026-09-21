import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface PublicProfile {
  id: string;
  locale: PlatformLocale;
  displayName: string | null;
  portraitAssetId: string | null;
  portraitAltText: string | null;
  professionalTitle: string | null;
  introduction: string | null;
  foundationalCopy: string | null;
  alternateLocale: PlatformLocale;
}

export async function getPublicProfile(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicProfile | null> {
  const profile = await db
    .selectFrom('profiles')
    .innerJoin(
      'profile_localizations',
      'profile_localizations.profile_id',
      'profiles.id',
    )
    .leftJoin(
      'asset_localizations as portrait_localization',
      (join) =>
        join
          .onRef('portrait_localization.asset_id', '=', 'profiles.portrait_asset_id')
          .onRef('portrait_localization.locale', '=', 'profile_localizations.locale'),
    )
    .select([
      'profiles.id',
      'profiles.display_name',
      'profiles.portrait_asset_id',
      'portrait_localization.alt_text as portrait_alt_text',
      'profile_localizations.professional_title',
      'profile_localizations.introduction',
      'profile_localizations.foundational_copy',
    ])
    .where('profiles.singleton_key', '=', 'public')
    .where('profile_localizations.locale', '=', locale)
    .executeTakeFirst();

  if (profile === undefined) {
    return null;
  }

  return {
    id: profile.id,
    locale,
    displayName: profile.display_name,
    portraitAssetId: profile.portrait_asset_id,
    portraitAltText: profile.portrait_alt_text,
    professionalTitle: profile.professional_title,
    introduction: profile.introduction,
    foundationalCopy: profile.foundational_copy,
    alternateLocale: locale === 'en' ? 'fr' : 'en',
  };
}
