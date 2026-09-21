import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('system_localizations')
    .addColumn('presentation_document', 'jsonb')
    .execute();

  await sql`
    alter table system_localizations
    add constraint system_localizations_presentation_document_check
    check (
      presentation_document is null
      or (
        jsonb_typeof(presentation_document) = 'object'
        and presentation_document -> 'version' = '1'::jsonb
        and jsonb_typeof(presentation_document -> 'blocks') = 'array'
        and presentation_document - 'version' - 'blocks' = '{}'::jsonb
      )
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table system_localizations
    drop constraint if exists system_localizations_presentation_document_check
  `.execute(db);

  await db.schema
    .alterTable('system_localizations')
    .dropColumn('presentation_document')
    .execute();
}
