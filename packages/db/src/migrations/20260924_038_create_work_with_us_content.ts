import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('work_with_us_pages')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('singleton_key', 'text', (column) =>
      column.notNull().defaultTo('public'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('work_with_us_pages_singleton_key_key', [
      'singleton_key',
    ])
    .addCheckConstraint(
      'work_with_us_pages_singleton_key_check',
      sql`singleton_key = 'public'`,
    )
    .execute();

  await db.schema
    .createTable('work_with_us_localizations')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('work_with_us_pages.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text')
    .addColumn('introduction', 'text')
    .addColumn('situations_title', 'text')
    .addColumn('situations_body', 'text')
    .addColumn('capabilities_title', 'text')
    .addColumn('capabilities_body', 'text')
    .addColumn('collaboration_title', 'text')
    .addColumn('collaboration_body', 'text')
    .addColumn('inquiry_title', 'text')
    .addColumn('inquiry_body', 'text')
    .addColumn('privacy_note', 'text')
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
    .addPrimaryKeyConstraint('work_with_us_localizations_pkey', [
      'page_id',
      'locale',
    ])
    .addCheckConstraint(
      'work_with_us_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'work_with_us_localizations_state_check',
      sql`editorial_state in ('draft', 'published')`,
    )
    .addCheckConstraint(
      'work_with_us_localizations_publication_check',
      sql`
        (editorial_state = 'draft' and published_at is null)
        or (editorial_state = 'published' and published_at is not null)
      `,
    )
    .addCheckConstraint(
      'work_with_us_localizations_title_length_check',
      sql`title is null or (length(trim(title)) > 0 and char_length(title) <= 140)`,
    )
    .addCheckConstraint(
      'work_with_us_localizations_introduction_length_check',
      sql`introduction is null or (length(trim(introduction)) > 0 and char_length(introduction) <= 700)`,
    )
    .execute();

  await db.schema
    .createTable('work_with_us_publications')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('work_with_us_pages.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('work_with_us_publications_pkey', [
      'page_id',
      'locale',
    ])
    .addCheckConstraint(
      'work_with_us_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('work_with_us_publications').execute();
  await db.schema.dropTable('work_with_us_localizations').execute();
  await db.schema.dropTable('work_with_us_pages').execute();
}
