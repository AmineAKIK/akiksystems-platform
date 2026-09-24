import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table writing_publications
    add column search_vector tsvector
    generated always as (
      case locale
        when 'fr' then
          setweight(
            to_tsvector('french'::regconfig, coalesce(snapshot ->> 'title', '')),
            'A'
          )
          ||
          setweight(
            to_tsvector('french'::regconfig, coalesce(snapshot ->> 'summary', '')),
            'B'
          )
          ||
          setweight(
            to_tsvector('french'::regconfig, coalesce(snapshot ->> 'body', '')),
            'C'
          )
        else
          setweight(
            to_tsvector('english'::regconfig, coalesce(snapshot ->> 'title', '')),
            'A'
          )
          ||
          setweight(
            to_tsvector('english'::regconfig, coalesce(snapshot ->> 'summary', '')),
            'B'
          )
          ||
          setweight(
            to_tsvector('english'::regconfig, coalesce(snapshot ->> 'body', '')),
            'C'
          )
      end
    ) stored
  `.execute(db);

  await sql`
    create index writing_publications_search_vector_gin_idx
    on writing_publications
    using gin (search_vector)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists writing_publications_search_vector_gin_idx
  `.execute(db);

  await sql`
    alter table writing_publications
    drop column if exists search_vector
  `.execute(db);
}
