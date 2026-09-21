import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_work_principles')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('profile_work_principles_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint(
      'profile_work_principles_position_check',
      sql`position >= 0`,
    )
    .execute();

  await db.schema
    .createTable('profile_work_principle_localizations')
    .addColumn('principle_id', 'uuid', (column) =>
      column
        .notNull()
        .references('profile_work_principles.id')
        .onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('detail', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_work_principle_localizations_pkey', [
      'principle_id',
      'locale',
    ])
    .addCheckConstraint(
      'profile_work_principle_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'profile_work_principle_localizations_title_not_blank_check',
      sql`length(trim(title)) > 0`,
    )
    .addCheckConstraint(
      'profile_work_principle_localizations_detail_not_blank_check',
      sql`detail is null or length(trim(detail)) > 0`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_work_principle_localizations').execute();
  await db.schema.dropTable('profile_work_principles').execute();
}
