import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_capability_groups')
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
    .addUniqueConstraint('profile_capability_groups_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint(
      'profile_capability_groups_position_check',
      sql`position >= 0`,
    )
    .execute();

  await db.schema
    .createTable('profile_capability_group_localizations')
    .addColumn('group_id', 'uuid', (column) =>
      column
        .notNull()
        .references('profile_capability_groups.id')
        .onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_capability_group_localizations_pkey', [
      'group_id',
      'locale',
    ])
    .addCheckConstraint(
      'profile_capability_group_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'profile_capability_group_localizations_title_not_blank_check',
      sql`length(trim(title)) > 0`,
    )
    .execute();

  await db.schema
    .createTable('profile_capabilities')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('group_id', 'uuid', (column) =>
      column
        .notNull()
        .references('profile_capability_groups.id')
        .onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addUniqueConstraint('profile_capabilities_group_position_key', [
      'group_id',
      'position',
    ])
    .addCheckConstraint('profile_capabilities_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createTable('profile_capability_localizations')
    .addColumn('capability_id', 'uuid', (column) =>
      column.notNull().references('profile_capabilities.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('summary', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_capability_localizations_pkey', [
      'capability_id',
      'locale',
    ])
    .addCheckConstraint(
      'profile_capability_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'profile_capability_localizations_title_not_blank_check',
      sql`length(trim(title)) > 0`,
    )
    .addCheckConstraint(
      'profile_capability_localizations_summary_not_blank_check',
      sql`summary is null or length(trim(summary)) > 0`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_capability_localizations').execute();
  await db.schema.dropTable('profile_capabilities').execute();
  await db.schema.dropTable('profile_capability_group_localizations').execute();
  await db.schema.dropTable('profile_capability_groups').execute();
}
