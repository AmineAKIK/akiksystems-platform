import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import { parseSystemPublicationSnapshot } from './system-publication.js';
import type { Database } from './schema.js';

export interface PublicProfileWorkPrincipleEvidence {
  id: string;
  slug: string;
  title: string;
}

export interface PublicProfileWorkPrinciple {
  id: string;
  position: number;
  title: string;
  detail: string | null;
  evidenceSystem: PublicProfileWorkPrincipleEvidence | null;
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

export interface PublicProfileTechnologyJourneyStageEvidence {
  kind: 'experience' | 'system';
  id: string;
  title: string;
  href: string | null;
}

export interface PublicProfileTechnologyJourneyStage {
  key:
    | 'programming'
    | 'networks_telecom'
    | 'it_support'
    | 'industry'
    | 'development_akiksystems';
  position: number;
  title: string;
  summary: string | null;
  evidence: PublicProfileTechnologyJourneyStageEvidence | null;
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
  sourceCvAssetId: string | null;
  professionalTitle: string | null;
  introduction: string | null;
  foundationalCopy: string | null;
  workPrinciples: PublicProfileWorkPrinciple[];
  representativeSystems: PublicProfileSystem[];
  professionalJourney: PublicProfileExperience[];
  technologyJourney: PublicProfileTechnologyJourneyStage[];
  capabilityGroups: PublicProfileCapabilityGroup[];
  languages: Array<'fr' | 'en' | 'ar'>;
  mobility: PublicProfileMobility;
  alternateLocale: PlatformLocale;
}

export async function getDraftProfile(
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
      'assets as source_cv_asset',
      (join) =>
        join
          .onRef('source_cv_asset.id', '=', 'profiles.source_cv_asset_id')
          .on('source_cv_asset.mime_type', '=', 'application/pdf'),
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
      'source_cv_asset.id as source_cv_asset_id',
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

  const technologyJourneyRows = await db
    .selectFrom('profile_technology_journey_stages')
    .innerJoin(
      'profile_technology_journey_stage_localizations',
      (join) =>
        join
          .onRef(
            'profile_technology_journey_stage_localizations.profile_id',
            '=',
            'profile_technology_journey_stages.profile_id',
          )
          .onRef(
            'profile_technology_journey_stage_localizations.stage_key',
            '=',
            'profile_technology_journey_stages.stage_key',
          )
          .on('profile_technology_journey_stage_localizations.locale', '=', locale),
    )
    .leftJoin(
      'experience_localizations as journey_experience',
      (join) =>
        join
          .onRef(
            'journey_experience.experience_id',
            '=',
            'profile_technology_journey_stages.evidence_experience_id',
          )
          .on('journey_experience.locale', '=', locale),
    )
    .leftJoin(
      'systems as journey_system',
      (join) =>
        join
          .onRef(
            'journey_system.id',
            '=',
            'profile_technology_journey_stages.evidence_system_id',
          )
          .on('journey_system.lifecycle', '=', 'active'),
    )
    .leftJoin(
      'system_localizations as journey_system_localization',
      (join) =>
        join
          .onRef(
            'journey_system_localization.system_id',
            '=',
            'journey_system.id',
          )
          .on('journey_system_localization.locale', '=', locale)
          .on('journey_system_localization.editorial_state', '=', 'published')
          .on('journey_system_localization.published_at', 'is not', null)
          .on('journey_system_localization.presentation_document', 'is not', null),
    )
    .select([
      'profile_technology_journey_stages.stage_key',
      'profile_technology_journey_stages.position',
      'profile_technology_journey_stages.evidence_experience_id',
      'profile_technology_journey_stages.evidence_system_id',
      'profile_technology_journey_stage_localizations.title',
      'profile_technology_journey_stage_localizations.summary',
      'journey_experience.title as evidence_experience_title',
      'journey_system.id as published_evidence_system_id',
      'journey_system_localization.slug as evidence_system_slug',
      'journey_system_localization.title as evidence_system_title',
    ])
    .where('profile_technology_journey_stages.profile_id', '=', profile.id)
    .orderBy('profile_technology_journey_stages.position')
    .execute();

  const technologyJourney: PublicProfileTechnologyJourneyStage[] =
    technologyJourneyRows.map((stage) => {
      const systemEvidence =
        stage.published_evidence_system_id !== null &&
        stage.evidence_system_slug !== null &&
        stage.evidence_system_title !== null
          ? {
              kind: 'system' as const,
              id: stage.published_evidence_system_id,
              title: stage.evidence_system_title,
              href:
                locale === 'fr'
                  ? `/fr/systems/${stage.evidence_system_slug}`
                  : `/en/systems/${stage.evidence_system_slug}`,
            }
          : null;
      const experienceEvidence =
        stage.evidence_experience_id !== null &&
        stage.evidence_experience_title !== null
          ? {
              kind: 'experience' as const,
              id: stage.evidence_experience_id,
              title: stage.evidence_experience_title,
              href: null,
            }
          : null;

      return {
        key: stage.stage_key,
        position: stage.position,
        title: stage.title,
        summary: stage.summary,
        evidence: systemEvidence ?? experienceEvidence,
      };
    });

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

  const workPrincipleRows = await db
    .selectFrom('profile_work_principles')
    .innerJoin(
      'profile_work_principle_localizations',
      'profile_work_principle_localizations.principle_id',
      'profile_work_principles.id',
    )
    .leftJoin(
      'systems as evidence_system',
      (join) =>
        join
          .onRef(
            'evidence_system.id',
            '=',
            'profile_work_principles.evidence_system_id',
          )
          .on('evidence_system.lifecycle', '=', 'active'),
    )
    .leftJoin(
      'system_localizations as evidence_localization',
      (join) =>
        join
          .onRef(
            'evidence_localization.system_id',
            '=',
            'evidence_system.id',
          )
          .on('evidence_localization.locale', '=', locale)
          .on('evidence_localization.editorial_state', '=', 'published')
          .on('evidence_localization.published_at', 'is not', null)
          .on('evidence_localization.presentation_document', 'is not', null),
    )
    .select([
      'profile_work_principles.id',
      'profile_work_principles.position',
      'profile_work_principle_localizations.title',
      'profile_work_principle_localizations.detail',
      'evidence_system.id as evidence_system_id',
      'evidence_localization.slug as evidence_slug',
      'evidence_localization.title as evidence_title',
    ])
    .where('profile_work_principles.profile_id', '=', profile.id)
    .where('profile_work_principle_localizations.locale', '=', locale)
    .orderBy('profile_work_principles.position')
    .execute();

  const workPrinciples: PublicProfileWorkPrinciple[] = workPrincipleRows.map(
    (principle) => ({
      id: principle.id,
      position: principle.position,
      title: principle.title,
      detail: principle.detail,
      evidenceSystem:
        principle.evidence_system_id !== null &&
        principle.evidence_slug !== null &&
        principle.evidence_title !== null
          ? {
              id: principle.evidence_system_id,
              slug: principle.evidence_slug,
              title: principle.evidence_title,
            }
          : null,
    }),
  );

  return {
    id: profile.id,
    locale,
    displayName: profile.display_name,
    portraitAssetId: profile.portrait_asset_id,
    portraitAltText: profile.portrait_alt_text,
    sourceCvAssetId: profile.source_cv_asset_id,
    professionalTitle: profile.professional_title,
    introduction: profile.introduction,
    foundationalCopy: profile.foundational_copy,
    workPrinciples,
    professionalJourney,
    technologyJourney,
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


function isPublicProfileSnapshot(value: unknown): value is PublicProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'locale' in value &&
    'displayName' in value &&
    'workPrinciples' in value &&
    'representativeSystems' in value
  );
}

export async function getPublicProfile(
  db: Kysely<Database>,
  locale: PlatformLocale,
): Promise<PublicProfile | null> {
  const publication = await db
    .selectFrom('profile_publications')
    .select('snapshot')
    .where('locale', '=', locale)
    .executeTakeFirst();

  if (publication === undefined || !isPublicProfileSnapshot(publication.snapshot)) {
    return null;
  }

  const snapshot = publication.snapshot;
  const systemIds = [
    ...new Set([
      ...snapshot.representativeSystems.map(({ id }) => id),
      ...snapshot.workPrinciples
        .map(({ evidenceSystem }) => evidenceSystem?.id ?? null)
        .filter((id): id is string => id !== null),
      ...snapshot.technologyJourney
        .filter(
          (stage) =>
            stage.evidence?.kind === 'system' && stage.evidence.id !== null,
        )
        .map((stage) => stage.evidence!.id),
    ]),
  ];

  if (systemIds.length === 0) {
    return snapshot;
  }

  const publicationRows = await db
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select(['systems.id', 'system_publications.snapshot'])
    .where('systems.id', 'in', systemIds)
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', locale)
    .execute();

  const publishedSystems = publicationRows.flatMap((row) => {
    const publication = parseSystemPublicationSnapshot(row.snapshot);
    return publication === null
      ? []
      : [{
          id: row.id,
          slug: publication.slug,
          title: publication.title,
          summary: publication.summary,
        }];
  });

  const systemById = new Map(
    publishedSystems.map((system) => [
      system.id,
      {
        id: system.id,
        slug: system.slug!,
        title: system.title!,
        summary: system.summary!,
      },
    ]),
  );

  return {
    ...snapshot,
    representativeSystems: snapshot.representativeSystems.flatMap(
      (system) => {
        const current = systemById.get(system.id);
        return current === undefined
          ? []
          : [
              {
                ...current,
                position: system.position,
              },
            ];
      },
    ),
    workPrinciples: snapshot.workPrinciples.map((principle) => ({
      ...principle,
      evidenceSystem:
        principle.evidenceSystem === null
          ? null
          : (() => {
              const current = systemById.get(principle.evidenceSystem.id);
              return current === undefined
                ? null
                : {
                    id: current.id,
                    slug: current.slug,
                    title: current.title,
                  };
            })(),
    })),
    technologyJourney: snapshot.technologyJourney.map((stage) => {
      if (stage.evidence?.kind !== 'system') {
        return stage;
      }

      const current = systemById.get(stage.evidence.id);
      return {
        ...stage,
        evidence:
          current === undefined
            ? null
            : {
                kind: 'system' as const,
                id: current.id,
                title: current.title,
                href:
                  locale === 'fr'
                    ? `/fr/systems/${current.slug}`
                    : `/en/systems/${current.slug}`,
              },
      };
    }),
  };
}
