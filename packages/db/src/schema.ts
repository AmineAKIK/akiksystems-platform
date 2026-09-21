import type {
  PlatformLocale,
  PresentationDocument,
  SystemEditorialState,
  SystemExperienceRelationKind,
  SystemLifecycle,
  SystemLinkKind,
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

export interface SystemMetadataTable {
  key: string;
  value: unknown;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface SystemsTable {
  id: string;
  lifecycle: DefaultedColumn<SystemLifecycle>;
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
  editorial_state: DefaultedColumn<SystemEditorialState>;
  published_at: NullableTimestampColumn;
  presentation_document: PresentationDocument | null;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface ProfilesTable {
  id: string;
  singleton_key: DefaultedColumn<'public'>;
  display_name: string | null;
  portrait_asset_id: string | null;
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

export type ProfileRow = Selectable<ProfilesTable>;
export type NewProfileRow = Insertable<ProfilesTable>;
export type ProfileUpdate = Updateable<ProfilesTable>;

export type ProfileLocalizationRow = Selectable<ProfileLocalizationsTable>;
export type NewProfileLocalizationRow = Insertable<ProfileLocalizationsTable>;
export type ProfileLocalizationUpdate = Updateable<ProfileLocalizationsTable>;

export type TechnologyRow = Selectable<TechnologiesTable>;
export type NewTechnologyRow = Insertable<TechnologiesTable>;
export type TechnologyUpdate = Updateable<TechnologiesTable>;

export type SystemTechnologyRow = Selectable<SystemTechnologiesTable>;
export type NewSystemTechnologyRow = Insertable<SystemTechnologiesTable>;
export type SystemTechnologyUpdate = Updateable<SystemTechnologiesTable>;

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
  profiles: ProfilesTable;
  profile_localizations: ProfileLocalizationsTable;
  technologies: TechnologiesTable;
  system_technologies: SystemTechnologiesTable;
  experiences: ExperiencesTable;
  experience_localizations: ExperienceLocalizationsTable;
  system_experiences: SystemExperiencesTable;
  assets: AssetsTable;
  asset_localizations: AssetLocalizationsTable;
  system_assets: SystemAssetsTable;
  system_links: SystemLinksTable;
  admin_audit_events: AdminAuditEventsTable;
}
