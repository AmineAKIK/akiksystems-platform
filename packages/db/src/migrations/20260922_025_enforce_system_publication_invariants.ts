import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    create sequence if not exists systems_editorial_position_seq
      as integer
      minvalue 0
      start with 0
  `.execute(db);

  await sql`
    select setval(
      'systems_editorial_position_seq',
      coalesce((select max(editorial_position) + 1 from systems), 0),
      false
    )
  `.execute(db);

  await sql`
    alter sequence systems_editorial_position_seq
    owned by systems.editorial_position
  `.execute(db);

  await sql`
    alter table systems
    alter column editorial_position
    set default nextval('systems_editorial_position_seq')
  `.execute(db);

  await sql`
    drop index if exists systems_editorial_position_unique
  `.execute(db);

  await sql`
    alter table systems
    add constraint systems_editorial_position_key
    unique (editorial_position)
    deferrable initially deferred
  `.execute(db);

  await sql`
    alter table system_publications
    add constraint system_publications_snapshot_identity_check
    check (
      jsonb_typeof(snapshot) = 'object'
      and snapshot ->> 'version' = '1'
      and snapshot ->> 'systemId' = system_id::text
      and snapshot ->> 'locale' = locale
      and snapshot ->> 'slug' = slug
    )
  `.execute(db);

  await sql`
    create table system_publication_assets (
      system_id uuid not null,
      locale text not null,
      asset_id uuid not null,
      created_at timestamptz not null default now(),
      constraint system_publication_assets_pkey
        primary key (system_id, locale, asset_id),
      constraint system_publication_assets_locale_check
        check (locale in ('en', 'fr')),
      constraint system_publication_assets_publication_fkey
        foreign key (system_id, locale)
        references system_publications(system_id, locale)
        on delete cascade,
      constraint system_publication_assets_asset_fkey
        foreign key (asset_id)
        references assets(id)
        on delete restrict
    )
  `.execute(db);

  await sql`
    create index system_publication_assets_asset_idx
    on system_publication_assets(asset_id)
  `.execute(db);

  await sql`
    insert into system_publication_assets (system_id, locale, asset_id)
    select
      publication.system_id,
      publication.locale,
      (media ->> 'id')::uuid
    from system_publications as publication
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(publication.snapshot -> 'media') = 'array'
          then publication.snapshot -> 'media'
        else '[]'::jsonb
      end
    ) as media
    where media ? 'id'
      and media ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists system_publication_assets_asset_idx
  `.execute(db);
  await sql`
    drop table if exists system_publication_assets
  `.execute(db);

  await sql`
    alter table system_publications
    drop constraint if exists system_publications_snapshot_identity_check
  `.execute(db);

  await sql`
    alter table systems
    drop constraint if exists systems_editorial_position_key
  `.execute(db);

  await db.schema
    .createIndex('systems_editorial_position_unique')
    .unique()
    .on('systems')
    .column('editorial_position')
    .execute();

  await sql`
    alter table systems
    alter column editorial_position set default 0
  `.execute(db);

  await sql`
    drop sequence if exists systems_editorial_position_seq
  `.execute(db);
}

    on conflict do nothing
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    drop index if exists system_publication_assets_asset_idx
  `.execute(db);
  await sql`
    drop table if exists system_publication_assets
  `.execute(db);

  await sql`
    alter table system_publications
    drop constraint if exists system_publications_snapshot_identity_check
  `.execute(db);

  await sql`
    alter table systems
    drop constraint if exists systems_editorial_position_key
  `.execute(db);

  await db.schema
    .createIndex('systems_editorial_position_unique')
    .unique()
    .on('systems')
    .column('editorial_position')
    .execute();

  await sql`
    alter table systems
    alter column editorial_position set default 0
  `.execute(db);

  await sql`
    drop sequence if exists systems_editorial_position_seq
  `.execute(db);
}
