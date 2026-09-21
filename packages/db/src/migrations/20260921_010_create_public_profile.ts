import { sql, type Kysely } from 'kysely';

const publicProfileId = '00000000-0000-4000-8000-000000000054';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profiles')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('singleton_key', 'text', (column) =>
      column.notNull().defaultTo('public'),
    )
    .addColumn('display_name', 'text')
    .addColumn('portrait_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('profiles_singleton_key_key', ['singleton_key'])
    .addCheckConstraint(
      'profiles_singleton_key_check',
      sql`singleton_key = 'public'`,
    )
    .execute();

  await db.schema
    .createTable('profile_localizations')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('professional_title', 'text')
    .addColumn('introduction', 'text')
    .addColumn('foundational_copy', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_localizations_pkey', [
      'profile_id',
      'locale',
    ])
    .addCheckConstraint(
      'profile_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();

  await db
    .insertInto('profiles')
    .values({
      id: publicProfileId,
      singleton_key: 'public',
    })
    .execute();

  await db
    .insertInto('profile_localizations')
    .values([
      { profile_id: publicProfileId, locale: 'en' },
      { profile_id: publicProfileId, locale: 'fr' },
    ])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_localizations').execute();
  await db.schema.dropTable('profiles').execute();
}
