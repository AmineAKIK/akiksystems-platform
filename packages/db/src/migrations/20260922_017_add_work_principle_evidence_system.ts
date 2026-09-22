import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('profile_work_principles')
    .addColumn('evidence_system_id', 'uuid', (column) =>
      column.references('systems.id').onDelete('set null'),
    )
    .execute();

  await sql`
    alter table profile_work_principle_localizations
    add constraint profile_work_principle_localizations_title_length_check
    check (char_length(title) <= 80)
  `.execute(db);

  await sql`
    alter table profile_work_principle_localizations
    add constraint profile_work_principle_localizations_detail_length_check
    check (detail is null or char_length(detail) <= 240)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table profile_work_principle_localizations
    drop constraint if exists profile_work_principle_localizations_detail_length_check
  `.execute(db);

  await sql`
    alter table profile_work_principle_localizations
    drop constraint if exists profile_work_principle_localizations_title_length_check
  `.execute(db);

  await db.schema
    .alterTable('profile_work_principles')
    .dropColumn('evidence_system_id')
    .execute();
}
