import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('technologies')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('slug', 'text', (column) => column.notNull().unique())
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'technologies_slug_not_blank_check',
      sql`length(trim(slug)) > 0`,
    )
    .addCheckConstraint(
      'technologies_name_not_blank_check',
      sql`length(trim(name)) > 0`,
    )
    .execute();

  await db.schema
    .createTable('system_technologies')
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('technology_id', 'uuid', (column) =>
      column.notNull().references('technologies.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('system_technologies_pkey', [
      'system_id',
      'technology_id',
    ])
    .addUniqueConstraint('system_technologies_system_position_key', [
      'system_id',
      'position',
    ])
    .addCheckConstraint(
      'system_technologies_position_check',
      sql`position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('system_technologies_technology_idx')
    .on('system_technologies')
    .column('technology_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_technologies').execute();
  await db.schema.dropTable('technologies').execute();
}
