import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('profiles')
    .addColumn('source_cv_asset_id', 'uuid', (column) =>
      column.references('assets.id').onDelete('set null'),
    )
    .execute();

  await sql`
    alter table profiles
    add constraint profiles_source_cv_distinct_from_portrait_check
    check (
      source_cv_asset_id is null
      or portrait_asset_id is null
      or source_cv_asset_id <> portrait_asset_id
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table profiles
    drop constraint if exists profiles_source_cv_distinct_from_portrait_check
  `.execute(db);

  await db.schema
    .alterTable('profiles')
    .dropColumn('source_cv_asset_id')
    .execute();
}
