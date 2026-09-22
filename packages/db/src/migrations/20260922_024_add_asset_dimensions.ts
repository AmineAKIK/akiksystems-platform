import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('assets')
    .addColumn('width', 'integer')
    .addColumn('height', 'integer')
    .execute();

  await sql`
    alter table assets
    add constraint assets_dimensions_check
    check (
      (width is null and height is null)
      or (
        width is not null
        and height is not null
        and width > 0
        and height > 0
      )
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table assets
    drop constraint if exists assets_dimensions_check
  `.execute(db);

  await db.schema
    .alterTable('assets')
    .dropColumn('height')
    .dropColumn('width')
    .execute();
}
