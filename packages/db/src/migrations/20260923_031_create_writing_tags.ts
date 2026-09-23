import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('tags')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('canonical_key', 'text', (column) => column.notNull().unique())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'tags_canonical_key_check',
      sql`canonical_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createTable('tag_localizations')
    .addColumn('tag_id', 'uuid', (column) =>
      column.notNull().references('tags.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text')
    .addColumn('name', 'text')
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
    .addPrimaryKeyConstraint('tag_localizations_pkey', ['tag_id', 'locale'])
    .addUniqueConstraint('tag_localizations_locale_slug_key', ['locale', 'slug'])
    .addCheckConstraint(
      'tag_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'tag_localizations_slug_check',
      sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .addCheckConstraint(
      'tag_localizations_publication_check',
      sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null and slug is not null and btrim(slug) <> '' and name is not null and btrim(name) <> '')`,
    )
    .execute();

  await db.schema
    .createTable('tag_publications')
    .addColumn('tag_id', 'uuid', (column) =>
      column.notNull().references('tags.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('tag_publications_pkey', ['tag_id', 'locale'])
    .addUniqueConstraint('tag_publications_locale_slug_key', ['locale', 'slug'])
    .addCheckConstraint(
      'tag_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'tag_publications_slug_check',
      sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createIndex('tag_publications_locale_idx')
    .on('tag_publications')
    .column('locale')
    .execute();

  await db.schema
    .createTable('writing_tags')
    .addColumn('writing_id', 'uuid', (column) =>
      column.notNull().references('writings.id').onDelete('cascade'),
    )
    .addColumn('tag_id', 'uuid', (column) =>
      column.notNull().references('tags.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('writing_tags_pkey', ['writing_id', 'tag_id'])
    .addUniqueConstraint('writing_tags_writing_position_key', [
      'writing_id',
      'position',
    ])
    .addCheckConstraint('writing_tags_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createIndex('writing_tags_tag_idx')
    .on('writing_tags')
    .columns(['tag_id', 'writing_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('writing_tags').execute();
  await db.schema.dropTable('tag_publications').execute();
  await db.schema.dropTable('tag_localizations').execute();
  await db.schema.dropTable('tags').execute();
}
