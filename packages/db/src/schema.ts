import type { ColumnType } from 'kysely';

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string
>;

export interface SystemMetadataTable {
  key: string;
  value: unknown;
  created_at: TimestampColumn;
  updated_at: TimestampColumn;
}

export interface Database {
  system_metadata: SystemMetadataTable;
}
