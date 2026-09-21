import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('assets')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('storage_key', 'text', (column) => column.notNull().unique())
    .addColumn('original_filename', 'text', (column) => column.notNull())
    .addColumn('mime_type', 'text', (column) => column.notNull())
    .addColumn('byte_size', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'assets_original_filename_not_blank_check',
      sql`length(trim(original_filename)) > 0`,
    )
    .addCheckConstraint(
      'assets_mime_type_check',
      sql`mime_type in (
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'application/pdf'
      )`,
    )
    .addCheckConstraint(
      'assets_byte_size_check',
      sql`byte_size > 0 and byte_size <= 10485760`,
    )
    .execute();

  await db.schema
    .createTable('asset_localizations')
    .addColumn('asset_id', 'uuid', (column) => column.notNull())
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('alt_text', 'text')
    .addColumn('caption', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('asset_localizations_pkey', ['asset_id', 'locale'])
    .addForeignKeyConstraint(
      'asset_localizations_asset_id_fkey',
      ['asset_id'],
      'assets',
      ['id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addCheckConstraint(
      'asset_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();

  await db.schema
    .createTable('system_assets')
    .addColumn('system_id', 'uuid', (column) => column.notNull())
    .addColumn('asset_id', 'uuid', (column) => column.notNull())
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('system_assets_pkey', ['system_id', 'asset_id'])
    .addForeignKeyConstraint(
      'system_assets_system_id_fkey',
      ['system_id'],
      'systems',
      ['id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'system_assets_asset_id_fkey',
      ['asset_id'],
      'assets',
      ['id'],
      (constraint) => constraint.onDelete('restrict'),
    )
    .addUniqueConstraint('system_assets_system_position_key', [
      'system_id',
      'position',
    ])
    .addCheckConstraint('system_assets_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createIndex('system_assets_asset_idx')
    .on('system_assets')
    .column('asset_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_assets').execute();
  await db.schema.dropTable('asset_localizations').execute();
  await db.schema.dropTable('assets').execute();
}
