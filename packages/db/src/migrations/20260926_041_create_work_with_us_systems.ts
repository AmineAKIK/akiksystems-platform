import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('work_with_us_systems')
    .addColumn('page_id', 'uuid', (column) =>
      column.notNull().references('work_with_us_pages.id').onDelete('cascade'),
    )
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('work_with_us_systems_pkey', [
      'page_id',
      'system_id',
    ])
    .addUniqueConstraint('work_with_us_systems_page_position_key', [
      'page_id',
      'position',
    ])
    .addCheckConstraint(
      'work_with_us_systems_position_check',
      sql`position >= 0 and position < 4`,
    )
    .execute();

  // Preserve the previous public baseline once, when those Systems already
  // exist. After this migration the selection is owned exclusively by admin.
  await sql`
    insert into work_with_us_systems (page_id, system_id, position)
    select page.id, system.id, legacy.position
    from work_with_us_pages as page
    cross join (
      values
        ('protocap'::text, 0),
        ('tugeres'::text, 1)
    ) as legacy(slug, position)
    join system_localizations as localization
      on localization.locale = 'en'
     and localization.slug = legacy.slug
    join systems as system
      on system.id = localization.system_id
    where page.singleton_key = 'public'
    on conflict do nothing
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('work_with_us_systems').execute();
}
