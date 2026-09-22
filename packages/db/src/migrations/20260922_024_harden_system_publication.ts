import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('system_links')
    .addColumn('label_en', 'text')
    .addColumn('label_fr', 'text')
    .execute();

  await sql`
    alter table system_links
    add constraint system_links_label_en_length_check
    check (label_en is null or (length(trim(label_en)) > 0 and char_length(label_en) <= 120))
  `.execute(db);

  await sql`
    alter table system_links
    add constraint system_links_label_fr_length_check
    check (label_fr is null or (length(trim(label_fr)) > 0 and char_length(label_fr) <= 120))
  `.execute(db);

  await db.schema
    .createTable('system_publications')
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('slug', 'text', (column) => column.notNull())
    .addColumn('snapshot', 'jsonb', (column) => column.notNull())
    .addColumn('published_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('system_publications_pkey', ['system_id', 'locale'])
    .addUniqueConstraint('system_publications_locale_slug_key', ['locale', 'slug'])
    .addCheckConstraint(
      'system_publications_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .execute();

  await sql`
    with ranked as (
      select
        id,
        (row_number() over (
          order by editorial_position, created_at, id
        ) - 1)::integer as normalized_position
      from systems
    )
    update systems
    set editorial_position = ranked.normalized_position,
        updated_at = case
          when systems.editorial_position <> ranked.normalized_position then now()
          else systems.updated_at
        end
    from ranked
    where systems.id = ranked.id
  `.execute(db);

  await db.schema
    .createIndex('systems_editorial_position_unique')
    .unique()
    .on('systems')
    .column('editorial_position')
    .execute();

  await sql`
    update system_links
    set
      label_en = case
        when kind = 'documentation' and url like '%case-study%' then 'Case study'
        when kind = 'documentation' and url like '%content-provenance%' then 'Content provenance'
        when kind = 'documentation' and url like '%tugeres-operations%' then 'Operations runbook'
        when kind = 'documentation' and url like '%guide-installation%' then 'Installation guide'
        else label_en
      end,
      label_fr = case
        when kind = 'documentation' and url like '%case-study%' then 'Étude de cas'
        when kind = 'documentation' and url like '%content-provenance%' then 'Provenance du contenu'
        when kind = 'documentation' and url like '%tugeres-operations%' then 'Runbook d exploitation'
        when kind = 'documentation' and url like '%guide-installation%' then 'Guide d installation'
        else label_fr
      end
    where kind = 'documentation'
  `.execute(db);

  await sql`
    update system_localizations
    set presentation_document = jsonb_set(
      presentation_document,
      '{blocks}',
      coalesce((
        select jsonb_agg(
          case
            when block ->> 'type' = 'heading'
              and block ->> 'level' = '2'
              and block ->> 'text' in ('What is implemented', 'Ce qui est implemente')
              then block || '{"evidenceStatus":"implemented"}'::jsonb
            when block ->> 'type' = 'heading'
              and block ->> 'level' = '2'
              and block ->> 'text' in ('Evidence boundaries', 'Limites et preuves')
              then block || '{"evidenceStatus":"boundary"}'::jsonb
            when block ->> 'type' = 'heading'
              and block ->> 'level' = '2'
              and block ->> 'text' in ('Hypotheses', 'Hypothèses')
              then block || '{"evidenceStatus":"hypothesis"}'::jsonb
            when block ->> 'type' = 'heading'
              and block ->> 'level' = '2'
              and block ->> 'text' in ('Future integrations', 'Intégrations futures')
              then block || '{"evidenceStatus":"future_integration"}'::jsonb
            else block
          end
          order by ordinality
        )
        from jsonb_array_elements(presentation_document -> 'blocks')
          with ordinality as blocks(block, ordinality)
      ), presentation_document -> 'blocks')
    )
    where presentation_document is not null
      and system_id in (
        select id from systems where presentation_kind = 'guided_demo'
      )
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('systems_editorial_position_unique').execute();
  await db.schema.dropTable('system_publications').execute();

  await sql`
    alter table system_links
    drop constraint if exists system_links_label_fr_length_check
  `.execute(db);
  await sql`
    alter table system_links
    drop constraint if exists system_links_label_en_length_check
  `.execute(db);

  await db.schema
    .alterTable('system_links')
    .dropColumn('label_fr')
    .dropColumn('label_en')
    .execute();
}
