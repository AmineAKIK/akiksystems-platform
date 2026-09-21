import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface PublicProfileWorkPrinciple {
  id: string;
  position: number;
  title: string;
  detail: string | null;
}

export interface PublicProfileSystem {
  id: string;
  position: number;
  slug: string;
  title: string;
  summary: string;
}

export interface PublicProfile {
  id: string;
  locale: PlatformLocale;
  displayName: string | null;
  portraitAssetId: string | null;
  portraitAltText: string | null;
  professionalTitle: string | null;
  introduction: string | null;
  foundationalCopy: string | null;
  workPrinciples: PublicProfileWorkPrinciple[];
  representativeSystems: PublicProfileSystem[];
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

  const representativeSystems = await db
    .selectFrom('profile_systems')
    .innerJoin('systems', 'systems.id', 'profile_systems.system_id')
    .innerJoin(
      'system_localizations',
      'system_localizations.system_id',
      'systems.id',
    )
    .select([
      'systems.id',
      'profile_systems.position',
      'system_localizations.slug',
      'system_localizations.title',
      'system_localizations.summary',
    ])
    .where('profile_systems.profile_id', '=', profile.id)
    .where('systems.lifecycle', '=', 'active')
    .where('system_localizations.locale', '=', locale)
    .where('system_localizations.editorial_state', '=', 'published')
    .where('system_localizations.slug', 'is not', null)
    .where('system_localizations.title', 'is not', null)
    .where('system_localizations.summary', 'is not', null)
    .orderBy('profile_systems.position')
    .execute();

  const workPrinciples = await db
    .selectFrom('profile_work_principles')
    .innerJoin(
      'profile_work_principle_localizations',
      'profile_work_principle_localizations.principle_id',
      'profile_work_principles.id',
    )
    .select([
      'profile_work_principles.id',
      'profile_work_principles.position',
      'profile_work_principle_localizations.title',
      'profile_work_principle_localizations.detail',
    ])
    .where('profile_work_principles.profile_id', '=', profile.id)
    .where('profile_work_principle_localizations.locale', '=', locale)
    .orderBy('profile_work_principles.position')
    .execute();

  return {
    id: profile.id,
    locale,
    displayName: profile.display_name,
    portraitAssetId: profile.portrait_asset_id,
    portraitAltText: profile.portrait_alt_text,
    professionalTitle: profile.professional_title,
    introduction: profile.introduction,
    foundationalCopy: profile.foundational_copy,
    workPrinciples,
    representativeSystems: representativeSystems.map((system) => ({
      id: system.id,
      position: system.position,
      slug: system.slug!,
      title: system.title!,
      summary: system.summary!,
    })),
    alternateLocale: locale === 'en' ? 'fr' : 'en',
  };
}
