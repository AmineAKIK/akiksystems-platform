import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('writing_localizations')
    .addColumn('editor_document', 'jsonb')
    .execute();

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

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('writing_localizations')
    .dropConstraint('writing_localizations_editor_document_check')
    .execute();

  await db.schema
    .alterTable('writing_localizations')
    .dropColumn('editor_document')
    .execute();
}
