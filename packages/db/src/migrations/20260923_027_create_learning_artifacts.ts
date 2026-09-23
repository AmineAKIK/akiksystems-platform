import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('learning_artifacts')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('training_id', 'uuid', (column) =>
      column.notNull().references('trainings.id').onDelete('restrict'),
    )
    .addColumn('system_id', 'uuid', (column) =>
      column.references('systems.id').onDelete('set null'),
    )
    .addColumn('source_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .addColumn('editorial_position', 'integer', (column) =>
      column.notNull().defaultTo(0),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'learning_artifacts_editorial_position_check',
      sql`editorial_position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('learning_artifacts_training_idx')
    .on('learning_artifacts')
    .columns(['training_id', 'editorial_position'])
    .execute();

  await db.schema
    .createIndex('learning_artifacts_system_idx')
    .on('learning_artifacts')
    .columns(['system_id', 'editorial_position'])
    .execute();

  await db.schema
    .createTable('learning_artifact_localizations')
    .addColumn('learning_artifact_id', 'uuid', (column) =>
      column.notNull().references('learning_artifacts.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text')
    .addColumn('title', 'text')
    .addColumn('summary', 'text')
    .addColumn('body', 'text')
    .addColumn('editorial_state', 'text', (column) =>
      column.notNull().defaultTo('draft'),
    )
    .addColumn('published_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('learning_artifact_localizations_pkey', [
      'learning_artifact_id',
      'locale',
    ])
    .addUniqueConstraint('learning_artifact_localizations_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'learning_artifact_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'learning_artifact_localizations_slug_check',
      sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .addCheckConstraint(
      'learning_artifact_localizations_editorial_publication_check',
      sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null)`,
    )
    .execute();

  await db.schema
    .createTable('learning_artifact_publications')
    .addColumn('learning_artifact_id', 'uuid', (column) =>
      column.notNull().references('learning_artifacts.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('learning_artifact_publications_pkey', [
      'learning_artifact_id',
      'locale',
    ])
    .addUniqueConstraint('learning_artifact_publications_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'learning_artifact_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'learning_artifact_publications_slug_check',
      sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createIndex('learning_artifact_publications_locale_idx')
    .on('learning_artifact_publications')
    .column('locale')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('learning_artifact_publications').execute();
  await db.schema.dropTable('learning_artifact_localizations').execute();
  await db.schema.dropTable('learning_artifacts').execute();
}
