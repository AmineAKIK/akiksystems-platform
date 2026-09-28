import { sql, type Kysely } from 'kysely';

const publicProfileId = '00000000-0000-4000-8000-000000000054';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profiles')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('singleton_key', 'text', (column) => column.notNull().defaultTo('public'))
    .addColumn('display_name', 'text')
    .addColumn('portrait_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .addColumn('source_cv_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .addColumn('current_system_id', 'uuid', (column) =>
      column.references('systems.id').onDelete('set null'),
    )
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('profiles_singleton_key_key', ['singleton_key'])
    .addCheckConstraint('profiles_singleton_key_check', sql`singleton_key = 'public'`)
    .addCheckConstraint(
      'profiles_display_name_check',
      sql`
        display_name is null
        or (length(trim(display_name)) > 0 and char_length(display_name) <= 80)
      `,
    )
    .addCheckConstraint(
      'profiles_source_cv_distinct_from_portrait_check',
      sql`
        source_cv_asset_id is null
        or portrait_asset_id is null
        or source_cv_asset_id <> portrait_asset_id
      `,
    )
    .execute();

  await db.schema
    .createTable('profile_localizations')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('content', 'jsonb', (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('editorial_state', 'text', (column) => column.notNull().defaultTo('draft'))
    .addColumn('published_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_localizations_pkey', ['profile_id', 'locale'])
    .addCheckConstraint('profile_localizations_locale_check', sql`locale in ('en', 'fr')`)
    .addCheckConstraint(
      'profile_localizations_state_check',
      sql`editorial_state in ('draft', 'published')`,
    )
    .addCheckConstraint(
      'profile_localizations_publication_check',
      sql`
        (editorial_state = 'draft' and published_at is null)
        or (editorial_state = 'published' and published_at is not null)
      `,
    )
    .execute();

  await db.schema
    .createTable('profile_publications')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_publications_pkey', ['profile_id', 'locale'])
    .addCheckConstraint('profile_publications_locale_check', sql`locale in ('en', 'fr')`)
    .execute();

  await db.schema
    .createTable('profile_contacts')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('kind', 'text', (column) => column.notNull())
    .addColumn('value', 'text', (column) => column.notNull())
    .addColumn('visible', 'boolean', (column) => column.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_contacts_pkey', ['profile_id', 'kind'])
    .addCheckConstraint(
      'profile_contacts_kind_check',
      sql`kind in ('linkedin', 'github', 'email', 'phone')`,
    )
    .addCheckConstraint('profile_contacts_value_not_blank_check', sql`length(trim(value)) > 0`)
    .execute();

  await db.schema
    .createTable('profile_languages')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('language_code', 'text', (column) => column.notNull())
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_languages_pkey', ['profile_id', 'language_code'])
    .addUniqueConstraint('profile_languages_profile_position_key', ['profile_id', 'position'])
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
    .addColumn('worldwide', 'boolean', (column) => column.notNull().defaultTo(false))
    .addColumn('remote', 'boolean', (column) => column.notNull().defaultTo(false))
    .addColumn('relocation', 'boolean', (column) => column.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable('profile_stack_groups')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint('profile_stack_groups_profile_position_key', ['profile_id', 'position'])
    .addCheckConstraint('profile_stack_groups_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createTable('profile_stack_group_localizations')
    .addColumn('group_id', 'uuid', (column) =>
      column.notNull().references('profile_stack_groups.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_stack_group_localizations_pkey', ['group_id', 'locale'])
    .addCheckConstraint(
      'profile_stack_group_localizations_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'profile_stack_group_localizations_title_check',
      sql`length(trim(title)) > 0 and char_length(title) <= 80`,
    )
    .execute();

  await db.schema
    .createTable('profile_stack_group_technologies')
    .addColumn('group_id', 'uuid', (column) =>
      column.notNull().references('profile_stack_groups.id').onDelete('cascade'),
    )
    .addColumn('technology_id', 'uuid', (column) =>
      column.notNull().references('technologies.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint('profile_stack_group_technologies_pkey', ['group_id', 'technology_id'])
    .addUniqueConstraint('profile_stack_group_technologies_group_position_key', [
      'group_id',
      'position',
    ])
    .addCheckConstraint('profile_stack_group_technologies_position_check', sql`position >= 0`)
    .execute();

  await sql`
    insert into profiles (id, singleton_key)
    values (${publicProfileId}::uuid, 'public')
  `.execute(db);

  await sql`
    insert into profile_localizations (profile_id, locale)
    values
      (${publicProfileId}::uuid, 'en'),
      (${publicProfileId}::uuid, 'fr')
  `.execute(db);

  await sql`
    insert into profile_mobility (profile_id)
    values (${publicProfileId}::uuid)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_stack_group_technologies').execute();
  await db.schema.dropTable('profile_stack_group_localizations').execute();
  await db.schema.dropTable('profile_stack_groups').execute();
  await db.schema.dropTable('profile_mobility').execute();
  await db.schema.dropTable('profile_languages').execute();
  await db.schema.dropTable('profile_contacts').execute();
  await db.schema.dropTable('profile_publications').execute();
  await db.schema.dropTable('profile_localizations').execute();
  await db.schema.dropTable('profiles').execute();
}
