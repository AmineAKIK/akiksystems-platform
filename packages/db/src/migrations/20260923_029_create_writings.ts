import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('writings')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('kind', 'text', (column) => column.notNull())
    .addColumn('editorial_weight', 'text', (column) =>
      column.notNull().defaultTo('normal'),
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
      'writings_kind_check',
      sql`kind in ('note', 'article', 'essay')`,
    )
    .addCheckConstraint(
      'writings_editorial_weight_check',
      sql`editorial_weight in ('normal', 'featured', 'major')`,
    )
    .addCheckConstraint(
      'writings_editorial_position_check',
      sql`editorial_position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('writings_editorial_position_idx')
    .on('writings')
    .columns(['editorial_position', 'created_at'])
    .execute();

  await db.schema
    .createTable('writing_localizations')
    .addColumn('writing_id', 'uuid', (column) =>
      column.notNull().references('writings.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('writing_localizations_pkey', [
      'writing_id',
      'locale',
    ])
    .addUniqueConstraint('writing_localizations_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'writing_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'writing_localizations_slug_check',
      sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .addCheckConstraint(
      'writing_localizations_editorial_publication_check',
      sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null)`,
    )
    .execute();

  await db.schema
    .createTable('writing_publications')
    .addColumn('writing_id', 'uuid', (column) =>
      column.notNull().references('writings.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('writing_publications_pkey', [
      'writing_id',
      'locale',
    ])
    .addUniqueConstraint('writing_publications_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'writing_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'writing_publications_slug_check',
      sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createIndex('writing_publications_locale_idx')
    .on('writing_publications')
    .column('locale')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('writing_publications').execute();
  await db.schema.dropTable('writing_localizations').execute();
  await db.schema.dropTable('writings').execute();
}
