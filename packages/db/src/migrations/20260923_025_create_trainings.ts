import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('trainings')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('provider', 'text', (column) => column.notNull())
    .addColumn('state', 'text', (column) => column.notNull().defaultTo('planned'))
    .addColumn('start_date', 'date')
    .addColumn('end_date', 'date')
    .addColumn('editorial_position', 'integer', (column) => column.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('trainings_provider_not_blank_check', sql`length(trim(provider)) > 0`)
    .addCheckConstraint('trainings_state_check', sql`state in ('planned', 'in_progress', 'completed')`)
    .addCheckConstraint('trainings_editorial_position_check', sql`editorial_position >= 0`)
    .addCheckConstraint('trainings_date_order_check', sql`start_date is null or end_date is null or end_date >= start_date`)
    .execute();

  await db.schema.createIndex('trainings_editorial_order_idx')
    .on('trainings').columns(['editorial_position', 'created_at']).execute();

  await db.schema
    .createTable('training_localizations')
    .addColumn('training_id', 'uuid', (column) => column.notNull().references('trainings.id').onDelete('cascade'))
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text')
    .addColumn('title', 'text')
    .addColumn('summary', 'text')
    .addColumn('body', 'text')
    .addColumn('editorial_state', 'text', (column) => column.notNull().defaultTo('draft'))
    .addColumn('published_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('training_localizations_pkey', ['training_id', 'locale'])
    .addUniqueConstraint('training_localizations_locale_slug_key', ['locale', 'slug'])
    .addCheckConstraint('training_localizations_locale_check', sql`locale in ('en', 'fr')`)
    .addCheckConstraint('training_localizations_slug_check', sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`)
    .addCheckConstraint('training_localizations_editorial_publication_check', sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null)`)
    .execute();

  await db.schema
    .createTable('training_publications')
    .addColumn('training_id', 'uuid', (column) => column.notNull().references('trainings.id').onDelete('cascade'))
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('training_publications_pkey', ['training_id', 'locale'])
    .addUniqueConstraint('training_publications_locale_slug_key', ['locale', 'slug'])
    .addCheckConstraint('training_publications_locale_check', sql`locale in ('en', 'fr')`)
    .addCheckConstraint('training_publications_slug_check', sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`)
    .execute();

  await db.schema.createIndex('training_publications_locale_idx').on('training_publications').column('locale').execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('training_publications').execute();
  await db.schema.dropTable('training_localizations').execute();
  await db.schema.dropTable('trainings').execute();
}
