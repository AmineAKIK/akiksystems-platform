import { randomUUID } from 'node:crypto';

import { sql, type Kysely } from 'kysely';

const pageKeys = ['privacy', 'legal', 'cookies'] as const;

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('legal_pages')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('page_key', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('legal_pages_page_key_key', ['page_key'])
    .addCheckConstraint(
      'legal_pages_page_key_check',
      sql`page_key in ('privacy', 'legal', 'cookies')`,
    )
    .execute();

  await db.schema
    .createTable('legal_page_localizations')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('legal_pages.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text')
    .addColumn('editor_document', 'jsonb')
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
    .addPrimaryKeyConstraint('legal_page_localizations_pkey', [
      'page_id',
      'locale',
    ])
    .addCheckConstraint(
      'legal_page_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'legal_page_localizations_state_check',
      sql`editorial_state in ('draft', 'published')`,
    )
    .addCheckConstraint(
      'legal_page_localizations_publication_check',
      sql`
        (editorial_state = 'draft' and published_at is null)
        or (editorial_state = 'published' and published_at is not null)
      `,
    )
    .addCheckConstraint(
      'legal_page_localizations_title_length_check',
      sql`title is null or (length(trim(title)) > 0 and char_length(title) <= 180)`,
    )
    .execute();

  await db.schema
    .createTable('legal_page_publications')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('legal_pages.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('legal_page_publications_pkey', [
      'page_id',
      'locale',
    ])
    .addCheckConstraint(
      'legal_page_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();

  for (const pageKey of pageKeys) {
    const pageId = randomUUID();

    await sql`
      insert into legal_pages (id, page_key)
      values (${pageId}::uuid, ${pageKey})
    `.execute(db);

    await sql`
      insert into legal_page_localizations (page_id, locale)
      values
        (${pageId}::uuid, 'en'),
        (${pageId}::uuid, 'fr')
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('legal_page_publications').execute();
  await db.schema.dropTable('legal_page_localizations').execute();
  await db.schema.dropTable('legal_pages').execute();
}
