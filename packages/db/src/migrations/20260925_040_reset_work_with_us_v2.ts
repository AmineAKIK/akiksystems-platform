import { sql, type Kysely } from 'kysely';

/**
 * Work with us is still under active product construction. The first L7 copy
 * model was exploratory, so this migration deliberately resets that editorial
 * slice instead of carrying compatibility fields into the new page contract.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`delete from work_with_us_publications`.execute(db);

  await db.schema.dropTable('work_with_us_localizations').execute();

  await db.schema
    .createTable('work_with_us_localizations')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('work_with_us_pages.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('content', 'jsonb', (column) =>
      column.notNull().defaultTo(sql`'{}'::jsonb`),
    )
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
    .execute();
}

/**
 * Reintroducing the retired exploratory contract would itself be a regression.
 * Restore from a database backup if this development reset ever needs undoing.
 */
export async function down(_db: Kysely<unknown>): Promise<void> {}
