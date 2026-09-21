import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table system_localizations
    add constraint system_localizations_publication_readiness_check
    check (
      editorial_state = 'draft'
      or (
        slug is not null
        and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        and title is not null
        and length(trim(title)) > 0
        and summary is not null
        and length(trim(summary)) > 0
        and presentation_document is not null
        and jsonb_typeof(presentation_document) = 'object'
        and presentation_document -> 'version' = '1'::jsonb
        and jsonb_typeof(presentation_document -> 'blocks') = 'array'
        and jsonb_array_length(presentation_document -> 'blocks') > 0
      )
    )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table system_localizations
    drop constraint if exists system_localizations_publication_readiness_check
  `.execute(db);
}
