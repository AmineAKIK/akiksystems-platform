import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('writing_assets')
    .addColumn('writing_id', 'uuid', (column) => column.notNull())
    .addColumn('asset_id', 'uuid', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('writing_assets_pkey', ['writing_id', 'asset_id'])
    .addForeignKeyConstraint(
      'writing_assets_writing_id_fkey',
      ['writing_id'],
      'writings',
      ['id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addForeignKeyConstraint(
      'writing_assets_asset_id_fkey',
      ['asset_id'],
      'assets',
      ['id'],
      (constraint) => constraint.onDelete('restrict'),
    )
    .execute();

  await db.schema
    .createIndex('writing_assets_asset_idx')
    .on('writing_assets')
    .column('asset_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('writing_assets').execute();
}
