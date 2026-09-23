import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    update writing_localizations
    set editor_document = jsonb_set(
      editor_document,
      '{version}',
      '1'::jsonb,
      true
    )
    where editor_document is not null
      and not (editor_document ? 'version')
  `.execute(db);

  await db.schema
    .alterTable('writing_localizations')
    .dropConstraint('writing_localizations_editor_document_check')
    .execute();

  await db.schema
    .alterTable('writing_localizations')
    .addCheckConstraint(
      'writing_localizations_editor_document_check',
      sql`
        editor_document is null
        or (
          jsonb_typeof(editor_document) = 'object'
          and editor_document ? 'type'
          and editor_document ->> 'type' = 'doc'
          and editor_document ? 'version'
          and editor_document ->> 'version' = '1'
          and editor_document ? 'content'
          and jsonb_typeof(editor_document -> 'content') = 'array'
          and (
            editor_document - 'version' - 'type' - 'content'
          ) = '{}'::jsonb
        )
      `,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('writing_localizations')
    .dropConstraint('writing_localizations_editor_document_check')
    .execute();

  await sql`
    update writing_localizations
    set editor_document = editor_document - 'version'
    where editor_document is not null
  `.execute(db);

  await db.schema
    .alterTable('writing_localizations')
    .addCheckConstraint(
      'writing_localizations_editor_document_check',
      sql`
        editor_document is null
        or (
          jsonb_typeof(editor_document) = 'object'
          and editor_document ->> 'type' = 'doc'
          and jsonb_typeof(editor_document -> 'content') = 'array'
        )
      `,
    )
    .execute();
}
