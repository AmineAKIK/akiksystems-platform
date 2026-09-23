import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('credentials')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('kind', 'text', (column) => column.notNull())
    .addColumn('issuer', 'text', (column) => column.notNull())
    .addColumn('issued_on', 'date')
    .addColumn('training_id', 'uuid', (column) =>
      column.references('trainings.id').onDelete('set null'),
    )
    .addColumn('source_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .addColumn('verification_url', 'text')
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
      'credentials_kind_check',
      sql`kind in ('diploma', 'title', 'certification')`,
    )
    .addCheckConstraint(
      'credentials_issuer_not_blank_check',
      sql`length(trim(issuer)) > 0`,
    )
    .addCheckConstraint(
      'credentials_verification_url_check',
      sql`verification_url is null or verification_url ~ '^https?://'`,
    )
    .addCheckConstraint(
      'credentials_editorial_position_check',
      sql`editorial_position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('credentials_training_idx')
    .on('credentials')
    .columns(['training_id', 'editorial_position'])
    .execute();

  await db.schema
    .createTable('credential_localizations')
    .addColumn('credential_id', 'uuid', (column) =>
      column.notNull().references('credentials.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('credential_localizations_pkey', [
      'credential_id',
      'locale',
    ])
    .addUniqueConstraint('credential_localizations_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'credential_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'credential_localizations_slug_check',
      sql`slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .addCheckConstraint(
      'credential_localizations_editorial_publication_check',
      sql`(editorial_state = 'draft' and published_at is null) or (editorial_state = 'published' and published_at is not null)`,
    )
    .execute();

  await db.schema
    .createTable('credential_publications')
    .addColumn('credential_id', 'uuid', (column) =>
      column.notNull().references('credentials.id').onDelete('cascade'),
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
    .addPrimaryKeyConstraint('credential_publications_pkey', [
      'credential_id',
      'locale',
    ])
    .addUniqueConstraint('credential_publications_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'credential_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'credential_publications_slug_check',
      sql`slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    )
    .execute();

  await db.schema
    .createIndex('credential_publications_locale_idx')
    .on('credential_publications')
    .column('locale')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('credential_publications').execute();
  await db.schema.dropTable('credential_localizations').execute();
  await db.schema.dropTable('credentials').execute();
}
