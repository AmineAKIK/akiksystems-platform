import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface PublicProfileWorkPrinciple {
  id: string;
  position: number;
  title: string;
  detail: string | null;
}

export interface PublicProfileCapability {
  id: string;
  position: number;
  title: string;
  summary: string | null;
}

export interface PublicProfileCapabilityGroup {
  id: string;
  position: number;
  title: string;
  capabilities: PublicProfileCapability[];
}

export interface PublicProfileExperience {
  id: string;
  position: number;
  title: string;
  summary: string | null;
}

export interface PublicProfileMobility {
  worldwide: boolean;
  remote: boolean;
  relocation: boolean;
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
  professionalJourney: PublicProfileExperience[];
  capabilityGroups: PublicProfileCapabilityGroup[];
  languages: Array<'fr' | 'en' | 'ar'>;
  mobility: PublicProfileMobility;
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

  const languages = await db
    .selectFrom('profile_languages')
    .select(['language_code'])
    .where('profile_id', '=', profile.id)
    .orderBy('position')
    .execute();

  const mobility = await db
    .selectFrom('profile_mobility')
    .select(['worldwide', 'remote', 'relocation'])
    .where('profile_id', '=', profile.id)
    .executeTakeFirst();

  const capabilityRows = await db
    .selectFrom('profile_capability_groups')
    .innerJoin(
      'profile_capability_group_localizations',
      'profile_capability_group_localizations.group_id',
      'profile_capability_groups.id',
    )
    .innerJoin(
      'profile_capabilities',
      'profile_capabilities.group_id',
      'profile_capability_groups.id',
    )
    .innerJoin(
      'profile_capability_localizations',
      'profile_capability_localizations.capability_id',
      'profile_capabilities.id',
    )
    .select([
      'profile_capability_groups.id as group_id',
      'profile_capability_groups.position as group_position',
      'profile_capability_group_localizations.title as group_title',
      'profile_capabilities.id as capability_id',
      'profile_capabilities.position as capability_position',
      'profile_capability_localizations.title as capability_title',
      'profile_capability_localizations.summary as capability_summary',
    ])
    .where('profile_capability_groups.profile_id', '=', profile.id)
    .where('profile_capability_group_localizations.locale', '=', locale)
    .where('profile_capability_localizations.locale', '=', locale)
    .orderBy('profile_capability_groups.position')
    .orderBy('profile_capabilities.position')
    .execute();

  const capabilityGroups: PublicProfileCapabilityGroup[] = [];
  for (const row of capabilityRows) {
    let group = capabilityGroups.find(({ id }) => id === row.group_id);
    if (group === undefined) {
      group = {
        id: row.group_id,
        position: row.group_position,
        title: row.group_title,
        capabilities: [],
      };
      capabilityGroups.push(group);
    }

    group.capabilities.push({
      id: row.capability_id,
      position: row.capability_position,
      title: row.capability_title,
      summary: row.capability_summary,
    });
  }

  const professionalJourney = await db
    .selectFrom('profile_experiences')
    .innerJoin(
      'experience_localizations',
      'experience_localizations.experience_id',
      'profile_experiences.experience_id',
    )
    .select([
      'profile_experiences.experience_id as id',
      'profile_experiences.position',
      'experience_localizations.title',
      'experience_localizations.summary',
    ])
    .where('profile_experiences.profile_id', '=', profile.id)
    .where('experience_localizations.locale', '=', locale)
    .orderBy('profile_experiences.position')
    .execute();

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
    .where('system_localizations.published_at', 'is not', null)
    .where('system_localizations.presentation_document', 'is not', null)
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
    professionalJourney,
    capabilityGroups,
    languages: languages.map(({ language_code }) => language_code),
    mobility: mobility ?? {
      worldwide: false,
      remote: false,
      relocation: false,
    },
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
