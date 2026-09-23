import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('categories')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
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
      'categories_editorial_position_check',
      sql`editorial_position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('categories_editorial_position_idx')
    .on('categories')
    .columns(['editorial_position', 'created_at'])
    .execute();

  await db.schema
    .createTable('category_localizations')
    .addColumn('category_id', 'uuid', (column) =>
      column.notNull().references('categories.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text')
    .addColumn('name', 'text')
    .addColumn('description', 'text')
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
    .addPrimaryKeyConstraint('category_localizations_pkey', [
      'category_id',
      'locale',
    ])
    .addUniqueConstraint('category_localizations_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'category_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'category_localizations_slug_check',
      sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .addCheckConstraint(
      'category_localizations_publication_check',
      sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null and slug is not null and btrim(slug) <> '' and name is not null and btrim(name) <> '')`,
    )
    .execute();

  await db.schema
    .createTable('category_publications')
    .addColumn('category_id', 'uuid', (column) =>
      column.notNull().references('categories.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('category_publications_pkey', [
      'category_id',
      'locale',
    ])
    .addUniqueConstraint('category_publications_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'category_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'category_publications_slug_check',
      sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createIndex('category_publications_locale_idx')
    .on('category_publications')
    .column('locale')
    .execute();

  await db.schema
    .createTable('writing_categories')
    .addColumn('writing_id', 'uuid', (column) =>
      column.notNull().references('writings.id').onDelete('cascade'),
    )
    .addColumn('category_id', 'uuid', (column) =>
      column.notNull().references('categories.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('writing_categories_pkey', [
      'writing_id',
      'category_id',
    ])
    .addUniqueConstraint('writing_categories_writing_position_key', [
      'writing_id',
      'position',
    ])
    .addCheckConstraint(
      'writing_categories_position_check',
      sql`position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('writing_categories_category_idx')
    .on('writing_categories')
    .columns(['category_id', 'writing_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('writing_categories').execute();
  await db.schema.dropTable('category_publications').execute();
  await db.schema.dropTable('category_localizations').execute();
  await db.schema.dropTable('categories').execute();
}
