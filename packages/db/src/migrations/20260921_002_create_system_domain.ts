import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('systems')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('lifecycle', 'text', (column) =>
      column.notNull().defaultTo('active'),
    )
    .addColumn('archived_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'systems_lifecycle_check',
      sql`lifecycle in ('active', 'archived')`,
    )
    .addCheckConstraint(
      'systems_archive_state_check',
      sql`(lifecycle = 'active' and archived_at is null) or
          (lifecycle = 'archived' and archived_at is not null)`,
    )
    .execute();

  await db.schema
    .createTable('system_localizations')
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text')
    .addColumn('title', 'text')
    .addColumn('summary', 'text')
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
    .addPrimaryKeyConstraint('system_localizations_pkey', [
      'system_id',
      'locale',
    ])
    .addUniqueConstraint('system_localizations_locale_slug_key', [
      'locale',
      'slug',
    ])
    .addCheckConstraint(
      'system_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'system_localizations_editorial_state_check',
      sql`editorial_state in ('draft', 'published')`,
    )
    .addCheckConstraint(
      'system_localizations_publication_state_check',
      sql`(editorial_state = 'draft' and published_at is null) or
          (editorial_state = 'published' and published_at is not null)`,
    )
    .execute();

  await db.schema
    .createIndex('system_localizations_publication_idx')
    .on('system_localizations')
    .columns(['locale', 'editorial_state'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('system_localizations').execute();
  await db.schema.dropTable('systems').execute();
}
