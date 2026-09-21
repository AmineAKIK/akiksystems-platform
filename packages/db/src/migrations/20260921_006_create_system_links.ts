import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('system_links')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('system_id', 'uuid', (column) => column.notNull())
    .addColumn('kind', 'text', (column) => column.notNull())
    .addColumn('url', 'text', (column) => column.notNull())
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      'system_links_system_id_fkey',
      ['system_id'],
      'systems',
      ['id'],
      (constraint) => constraint.onDelete('cascade'),
    )
    .addCheckConstraint(
      'system_links_kind_check',
      sql`kind in ('live', 'repository', 'demo', 'documentation')`,
    )
    .addCheckConstraint(
      'system_links_url_check',
      sql`url ~ '^https?://[^[:space:]]+$'`,
    )
    .addCheckConstraint(
      'system_links_position_check',
      sql`position >= 0`,
    )
    .addUniqueConstraint('system_links_system_position_key', [
      'system_id',
      'position',
    ])
    .addUniqueConstraint('system_links_system_kind_url_key', [
      'system_id',
      'kind',
      'url',
    ])
    .execute();

  await db.schema
    .createIndex('system_links_system_kind_idx')
    .on('system_links')
    .columns(['system_id', 'kind'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_links').execute();
}
