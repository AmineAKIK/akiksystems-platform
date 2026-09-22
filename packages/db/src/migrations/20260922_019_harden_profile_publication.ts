import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_publications')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_publications_pkey', ['profile_id', 'locale'])
    .addCheckConstraint(
      'profile_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();

  await sql`
    alter table profiles
    add constraint profiles_display_name_length_check
    check (
      display_name is null
      or (length(trim(display_name)) > 0 and char_length(display_name) <= 80)
    )
  `.execute(db);

  await sql`
    alter table profile_localizations
    add constraint profile_localizations_professional_title_length_check
    check (
      professional_title is null
      or (length(trim(professional_title)) > 0 and char_length(professional_title) <= 100)
    )
  `.execute(db);

  await sql`
    alter table profile_localizations
    add constraint profile_localizations_introduction_length_check
    check (
      introduction is null
      or (length(trim(introduction)) > 0 and char_length(introduction) <= 320)
    )
  `.execute(db);

  await sql`
    alter table profile_localizations
    add constraint profile_localizations_foundational_copy_length_check
    check (
      foundational_copy is null
      or (length(trim(foundational_copy)) > 0 and char_length(foundational_copy) <= 600)
    )
  `.execute(db);

  await sql`
    alter table profile_capability_group_localizations
    add constraint profile_capability_group_localizations_title_length_check
    check (char_length(title) <= 80)
  `.execute(db);

  await sql`
    alter table profile_capability_localizations
    add constraint profile_capability_localizations_title_length_check
    check (char_length(title) <= 100)
  `.execute(db);

  await sql`
    alter table profile_capability_localizations
    add constraint profile_capability_localizations_summary_length_check
    check (summary is null or char_length(summary) <= 280)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table profile_capability_localizations
    drop constraint if exists profile_capability_localizations_summary_length_check
  `.execute(db);
  await sql`
    alter table profile_capability_localizations
    drop constraint if exists profile_capability_localizations_title_length_check
  `.execute(db);
  await sql`
    alter table profile_capability_group_localizations
    drop constraint if exists profile_capability_group_localizations_title_length_check
  `.execute(db);
  await sql`
    alter table profile_localizations
    drop constraint if exists profile_localizations_foundational_copy_length_check
  `.execute(db);
  await sql`
    alter table profile_localizations
    drop constraint if exists profile_localizations_introduction_length_check
  `.execute(db);
  await sql`
    alter table profile_localizations
    drop constraint if exists profile_localizations_professional_title_length_check
  `.execute(db);
  await sql`
    alter table profiles
    drop constraint if exists profiles_display_name_length_check
  `.execute(db);
  await db.schema.dropTable('profile_publications').execute();
}
