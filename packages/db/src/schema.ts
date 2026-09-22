import type {
  PlatformLocale,
  PresentationDocument,
  SystemEditorialState,
  SystemEvidencePolicy,
  SystemExperienceRelationKind,
  SystemLifecycle,
  SystemLinkKind,
  SystemPresentationKind,
  TrainingState,
} from '@akiksystems/core';
import type {
  ColumnType,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string
>;

export type NullableTimestampColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;

export type DefaultedColumn<Value> = ColumnType<
  Value,
  Value | undefined,
  Value
>;

export type ProfileLanguageCode = 'fr' | 'en' | 'ar';
export type ProfileTechnologyJourneyStageKey =
  | 'programming'
  | 'networks_telecom'
  | 'it_support'
  | 'industry'
  | 'development_akiksystems';

export interface SystemMetadataTable {
  key: string;
  value: unknown;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemsTable {
  id: string;
  lifecycle: DefaultedColumn<SystemLifecycle>;
  presentation_kind: DefaultedColumn<SystemPresentationKind>;
  evidence_policy: DefaultedColumn<SystemEvidencePolicy>;
  editorial_position: DefaultedColumn<number>;
  featured: DefaultedColumn<boolean>;
  archived_at: NullableTimestampColumn;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemLocalizationsTable {
  system_id: string;
  locale: PlatformLocale;
  slug: string | null;
  title: string | null;
  summary: string | null;
  proof_role: string | null;
  proof_maturity: string | null;
  proof_demo_nature: string | null;
  proof_data_nature: string | null;
  proof_limits: string | null;
  editorial_state: DefaultedColumn<SystemEditorialState>;
  published_at: NullableTimestampColumn;
  presentation_document: PresentationDocument | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemPublicationsTable {
  system_id: string;
  locale: PlatformLocale;
  slug: string;
  snapshot: Record<string, unknown>;
  published_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfilesTable {
  id: string;
  singleton_key: DefaultedColumn<'public'>;
  display_name: string | null;
  portrait_asset_id: string | null;
  source_cv_asset_id: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileLocalizationsTable {
  profile_id: string;
  locale: PlatformLocale;
  professional_title: string | null;
  introduction: string | null;
  foundational_copy: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfilePublicationsTable {
  profile_id: string;
  locale: PlatformLocale;
  snapshot: Record<string, unknown>;
  published_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileWorkPrinciplesTable {
  id: string;
  profile_id: string;
  position: number;
  evidence_system_id: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileWorkPrincipleLocalizationsTable {
  principle_id: string;
  locale: PlatformLocale;
  title: string;
  detail: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileCapabilityGroupsTable {
  id: string;
  profile_id: string;
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileCapabilityGroupLocalizationsTable {
  group_id: string;
  locale: PlatformLocale;
  title: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileCapabilitiesTable {
  id: string;
  group_id: string;
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileCapabilityLocalizationsTable {
  capability_id: string;
  locale: PlatformLocale;
  title: string;
  summary: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileLanguagesTable {
  profile_id: string;
  language_code: ProfileLanguageCode;
  position: number;
  created_at: TimestampColumn;
}

export interface ProfileMobilityTable {
  profile_id: string;
  worldwide: boolean;
  remote: boolean;
  relocation: boolean;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileTechnologyJourneyStagesTable {
  profile_id: string;
  stage_key: ProfileTechnologyJourneyStageKey;
  position: number;
  evidence_experience_id: string | null;
  evidence_system_id: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileTechnologyJourneyStageLocalizationsTable {
  profile_id: string;
  stage_key: ProfileTechnologyJourneyStageKey;
  locale: PlatformLocale;
  title: string;
  summary: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfileExperiencesTable {
  profile_id: string;
  experience_id: string;
  position: number;
  created_at: TimestampColumn;
}

export interface ProfileSystemsTable {
  profile_id: string;
  system_id: string;
  position: number;
  created_at: TimestampColumn;
}

export interface TechnologiesTable {
  id: string;
  slug: string;
  name: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemTechnologiesTable {
  system_id: string;
  technology_id: string;
  position: number;
  created_at: TimestampColumn;
}

export interface TrainingsTable {
  id: string;
  provider: string;
  state: TrainingState;
  start_date: ColumnType<string | null, string | null | undefined, string | null>;
  end_date: ColumnType<string | null, string | null | undefined, string | null>;
  editorial_position: DefaultedColumn<number>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface TrainingLocalizationsTable {
  training_id: string;
  locale: PlatformLocale;
  slug: string | null;
  title: string | null;
  summary: string | null;
  body: string | null;
  editorial_state: DefaultedColumn<SystemEditorialState>;
  published_at: NullableTimestampColumn;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface TrainingPublicationsTable {
  training_id: string;
  locale: PlatformLocale;
  slug: string;
  snapshot: Record<string, unknown>;
  published_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ExperiencesTable {
  id: string;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ExperienceLocalizationsTable {
  experience_id: string;
  locale: PlatformLocale;
  title: string;
  summary: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemExperiencesTable {
  system_id: string;
  experience_id: string;
  relation_kind: SystemExperienceRelationKind;
  created_at: TimestampColumn;
}

export interface AssetsTable {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  width: ColumnType<number | null, number | null | undefined, number | null>;
  height: ColumnType<number | null, number | null | undefined, number | null>;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface AssetLocalizationsTable {
  asset_id: string;
  locale: PlatformLocale;
  alt_text: string | null;
  caption: string | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemAssetsTable {
  system_id: string;
  asset_id: string;
  position: number;
  created_at: TimestampColumn;
}

export interface SystemLinksTable {
  id: string;
  system_id: string;
  kind: SystemLinkKind;
  url: string;
  label_en: string | null;
  label_fr: string | null;
  position: number;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface AdminAuditEventsTable {
  id: string;
  actor_user_id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  system_id: string | null;
  locale: PlatformLocale | null;
  metadata: Record<string, unknown>;
  created_at: TimestampColumn;
}

export type SystemRow = Selectable<SystemsTable>;
export type NewSystemRow = Insertable<SystemsTable>;
export type SystemUpdate = Updateable<SystemsTable>;

export type SystemLocalizationRow = Selectable<SystemLocalizationsTable>;
export type NewSystemLocalizationRow = Insertable<SystemLocalizationsTable>;
export type SystemLocalizationUpdate = Updateable<SystemLocalizationsTable>;

export type SystemPublicationRow = Selectable<SystemPublicationsTable>;
export type NewSystemPublicationRow = Insertable<SystemPublicationsTable>;
export type SystemPublicationUpdate = Updateable<SystemPublicationsTable>;

export type ProfileRow = Selectable<ProfilesTable>;
export type NewProfileRow = Insertable<ProfilesTable>;
export type ProfileUpdate = Updateable<ProfilesTable>;

export type ProfileLocalizationRow = Selectable<ProfileLocalizationsTable>;
export type NewProfileLocalizationRow = Insertable<ProfileLocalizationsTable>;
export type ProfileLocalizationUpdate = Updateable<ProfileLocalizationsTable>;

export type ProfilePublicationRow = Selectable<ProfilePublicationsTable>;
export type NewProfilePublicationRow = Insertable<ProfilePublicationsTable>;
export type ProfilePublicationUpdate = Updateable<ProfilePublicationsTable>;

export type ProfileWorkPrincipleRow = Selectable<ProfileWorkPrinciplesTable>;
export type NewProfileWorkPrincipleRow = Insertable<ProfileWorkPrinciplesTable>;
export type ProfileWorkPrincipleUpdate = Updateable<ProfileWorkPrinciplesTable>;

export type ProfileWorkPrincipleLocalizationRow =
  Selectable<ProfileWorkPrincipleLocalizationsTable>;
export type NewProfileWorkPrincipleLocalizationRow =
  Insertable<ProfileWorkPrincipleLocalizationsTable>;
export type ProfileWorkPrincipleLocalizationUpdate =
  Updateable<ProfileWorkPrincipleLocalizationsTable>;

export type ProfileCapabilityGroupRow = Selectable<ProfileCapabilityGroupsTable>;
export type NewProfileCapabilityGroupRow = Insertable<ProfileCapabilityGroupsTable>;
export type ProfileCapabilityGroupUpdate = Updateable<ProfileCapabilityGroupsTable>;

export type ProfileCapabilityGroupLocalizationRow =
  Selectable<ProfileCapabilityGroupLocalizationsTable>;
export type NewProfileCapabilityGroupLocalizationRow =
  Insertable<ProfileCapabilityGroupLocalizationsTable>;
export type ProfileCapabilityGroupLocalizationUpdate =
  Updateable<ProfileCapabilityGroupLocalizationsTable>;

export type ProfileCapabilityRow = Selectable<ProfileCapabilitiesTable>;
export type NewProfileCapabilityRow = Insertable<ProfileCapabilitiesTable>;
export type ProfileCapabilityUpdate = Updateable<ProfileCapabilitiesTable>;

export type ProfileCapabilityLocalizationRow =
  Selectable<ProfileCapabilityLocalizationsTable>;
export type NewProfileCapabilityLocalizationRow =
  Insertable<ProfileCapabilityLocalizationsTable>;
export type ProfileCapabilityLocalizationUpdate =
  Updateable<ProfileCapabilityLocalizationsTable>;

export type ProfileLanguageRow = Selectable<ProfileLanguagesTable>;
export type NewProfileLanguageRow = Insertable<ProfileLanguagesTable>;
export type ProfileLanguageUpdate = Updateable<ProfileLanguagesTable>;

export type ProfileMobilityRow = Selectable<ProfileMobilityTable>;
export type NewProfileMobilityRow = Insertable<ProfileMobilityTable>;
export type ProfileMobilityUpdate = Updateable<ProfileMobilityTable>;

export type ProfileTechnologyJourneyStageRow =
  Selectable<ProfileTechnologyJourneyStagesTable>;
export type NewProfileTechnologyJourneyStageRow =
  Insertable<ProfileTechnologyJourneyStagesTable>;
export type ProfileTechnologyJourneyStageUpdate =
  Updateable<ProfileTechnologyJourneyStagesTable>;

export type ProfileTechnologyJourneyStageLocalizationRow =
  Selectable<ProfileTechnologyJourneyStageLocalizationsTable>;
export type NewProfileTechnologyJourneyStageLocalizationRow =
  Insertable<ProfileTechnologyJourneyStageLocalizationsTable>;
export type ProfileTechnologyJourneyStageLocalizationUpdate =
  Updateable<ProfileTechnologyJourneyStageLocalizationsTable>;

export type ProfileExperienceRow = Selectable<ProfileExperiencesTable>;
export type NewProfileExperienceRow = Insertable<ProfileExperiencesTable>;
export type ProfileExperienceUpdate = Updateable<ProfileExperiencesTable>;

export type ProfileSystemRow = Selectable<ProfileSystemsTable>;
export type NewProfileSystemRow = Insertable<ProfileSystemsTable>;
export type ProfileSystemUpdate = Updateable<ProfileSystemsTable>;

export type TechnologyRow = Selectable<TechnologiesTable>;
export type NewTechnologyRow = Insertable<TechnologiesTable>;
export type TechnologyUpdate = Updateable<TechnologiesTable>;

export type SystemTechnologyRow = Selectable<SystemTechnologiesTable>;
export type NewSystemTechnologyRow = Insertable<SystemTechnologiesTable>;
export type SystemTechnologyUpdate = Updateable<SystemTechnologiesTable>;

export type TrainingRow = Selectable<TrainingsTable>;
export type NewTrainingRow = Insertable<TrainingsTable>;
export type TrainingUpdate = Updateable<TrainingsTable>;

export type TrainingLocalizationRow = Selectable<TrainingLocalizationsTable>;
export type NewTrainingLocalizationRow = Insertable<TrainingLocalizationsTable>;
export type TrainingLocalizationUpdate = Updateable<TrainingLocalizationsTable>;

export type TrainingPublicationRow = Selectable<TrainingPublicationsTable>;
export type NewTrainingPublicationRow = Insertable<TrainingPublicationsTable>;
export type TrainingPublicationUpdate = Updateable<TrainingPublicationsTable>;

export type ExperienceRow = Selectable<ExperiencesTable>;
export type NewExperienceRow = Insertable<ExperiencesTable>;
export type ExperienceUpdate = Updateable<ExperiencesTable>;

export type ExperienceLocalizationRow =
  Selectable<ExperienceLocalizationsTable>;
export type NewExperienceLocalizationRow =
  Insertable<ExperienceLocalizationsTable>;
export type ExperienceLocalizationUpdate =
  Updateable<ExperienceLocalizationsTable>;

export type SystemExperienceRow = Selectable<SystemExperiencesTable>;
export type NewSystemExperienceRow = Insertable<SystemExperiencesTable>;
export type SystemExperienceUpdate = Updateable<SystemExperiencesTable>;

export type AssetRow = Selectable<AssetsTable>;
export type NewAssetRow = Insertable<AssetsTable>;
export type AssetUpdate = Updateable<AssetsTable>;

export type AssetLocalizationRow = Selectable<AssetLocalizationsTable>;
export type NewAssetLocalizationRow = Insertable<AssetLocalizationsTable>;
export type AssetLocalizationUpdate = Updateable<AssetLocalizationsTable>;

export type SystemAssetRow = Selectable<SystemAssetsTable>;
export type NewSystemAssetRow = Insertable<SystemAssetsTable>;
export type SystemAssetUpdate = Updateable<SystemAssetsTable>;

export type SystemLinkRow = Selectable<SystemLinksTable>;
export type NewSystemLinkRow = Insertable<SystemLinksTable>;
export type SystemLinkUpdate = Updateable<SystemLinksTable>;

export type AdminAuditEventRow = Selectable<AdminAuditEventsTable>;
export type NewAdminAuditEventRow = Insertable<AdminAuditEventsTable>;

export interface Database {
  system_metadata: SystemMetadataTable;
  systems: SystemsTable;
  system_localizations: SystemLocalizationsTable;
  system_publications: SystemPublicationsTable;
  profiles: ProfilesTable;
  profile_localizations: ProfileLocalizationsTable;
  profile_publications: ProfilePublicationsTable;
  profile_work_principles: ProfileWorkPrinciplesTable;
  profile_work_principle_localizations: ProfileWorkPrincipleLocalizationsTable;
  profile_capability_groups: ProfileCapabilityGroupsTable;
  profile_capability_group_localizations: ProfileCapabilityGroupLocalizationsTable;
  profile_capabilities: ProfileCapabilitiesTable;
  profile_capability_localizations: ProfileCapabilityLocalizationsTable;
  profile_languages: ProfileLanguagesTable;
  profile_mobility: ProfileMobilityTable;
  profile_technology_journey_stages: ProfileTechnologyJourneyStagesTable;
  profile_technology_journey_stage_localizations: ProfileTechnologyJourneyStageLocalizationsTable;
  profile_experiences: ProfileExperiencesTable;
  profile_systems: ProfileSystemsTable;
  technologies: TechnologiesTable;
  system_technologies: SystemTechnologiesTable;
  trainings: TrainingsTable;
  training_localizations: TrainingLocalizationsTable;
  training_publications: TrainingPublicationsTable;
  experiences: ExperiencesTable;
  experience_localizations: ExperienceLocalizationsTable;
  system_experiences: SystemExperiencesTable;
  assets: AssetsTable;
  asset_localizations: AssetLocalizationsTable;
  system_assets: SystemAssetsTable;
  system_links: SystemLinksTable;
  admin_audit_events: AdminAuditEventsTable;
}
