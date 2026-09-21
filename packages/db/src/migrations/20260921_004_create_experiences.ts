import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('experiences')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable('experience_localizations')
    .addColumn('experience_id', 'uuid', (column) =>
      column.notNull().references('experiences.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('summary', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('experience_localizations_pkey', [
      'experience_id',
      'locale',
    ])
    .addCheckConstraint(
      'experience_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'experience_localizations_title_not_blank_check',
      sql`length(trim(title)) > 0`,
    )
    .execute();

  await db.schema
    .createTable('system_experiences')
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('experience_id', 'uuid', (column) =>
      column.notNull().references('experiences.id').onDelete('cascade'),
    )
    .addColumn('relation_kind', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('system_experiences_pkey', [
      'system_id',
      'experience_id',
      'relation_kind',
    ])
    .addCheckConstraint(
      'system_experiences_relation_kind_check',
      sql`relation_kind in ('origin_context')`,
    )
    .execute();

  await db.schema
    .createIndex('system_experiences_experience_idx')
    .on('system_experiences')
    .column('experience_id')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_experiences').execute();
  await db.schema.dropTable('experience_localizations').execute();
  await db.schema.dropTable('experiences').execute();
}
