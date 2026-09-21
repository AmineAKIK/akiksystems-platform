import type {
  PlatformLocale,
  SystemEditorialState,
  SystemLifecycle,
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

export type SystemRow = Selectable<SystemsTable>;
export type NewSystemRow = Insertable<SystemsTable>;
export type SystemUpdate = Updateable<SystemsTable>;

export type SystemLocalizationRow = Selectable<SystemLocalizationsTable>;
export type NewSystemLocalizationRow = Insertable<SystemLocalizationsTable>;
export type SystemLocalizationUpdate = Updateable<SystemLocalizationsTable>;

export type TechnologyRow = Selectable<TechnologiesTable>;
export type NewTechnologyRow = Insertable<TechnologiesTable>;
export type TechnologyUpdate = Updateable<TechnologiesTable>;

export type SystemTechnologyRow = Selectable<SystemTechnologiesTable>;
export type NewSystemTechnologyRow = Insertable<SystemTechnologiesTable>;
export type SystemTechnologyUpdate = Updateable<SystemTechnologiesTable>;

export interface Database {
  system_metadata: SystemMetadataTable;
  systems: SystemsTable;
  system_localizations: SystemLocalizationsTable;
  technologies: TechnologiesTable;
  system_technologies: SystemTechnologiesTable;
}
