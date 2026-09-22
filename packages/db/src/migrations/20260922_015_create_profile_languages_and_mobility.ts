import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_languages')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('language_code', 'text', (column) => column.notNull())
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_languages_pkey', [
      'profile_id',
      'language_code',
    ])
    .addUniqueConstraint('profile_languages_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint(
      'profile_languages_language_code_check',
      sql`language_code in ('fr', 'en', 'ar')`,
    )
    .addCheckConstraint('profile_languages_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createTable('profile_mobility')
    .addColumn('profile_id', 'uuid', (column) =>
      column.primaryKey().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('worldwide', 'boolean', (column) =>
      column.notNull().defaultTo(false),
    )
    .addColumn('remote', 'boolean', (column) =>
      column.notNull().defaultTo(false),
    )
    .addColumn('relocation', 'boolean', (column) =>
      column.notNull().defaultTo(false),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db
    .insertInto('profile_mobility')
    .columns(['profile_id'])
    .expression(
      db
        .selectFrom('profiles')
        .select('id as profile_id')
        .where('singleton_key', '=', 'public'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_mobility').execute();
  await db.schema.dropTable('profile_languages').execute();
}
