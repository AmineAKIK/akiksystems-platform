import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('system_localizations')
    .addColumn('proof_role', 'text')
    .addColumn('proof_maturity', 'text')
    .addColumn('proof_demo_nature', 'text')
    .addColumn('proof_data_nature', 'text')
    .addColumn('proof_limits', 'text')
    .execute();

  await sql`
    update system_localizations as localization
    set
      proof_role = case
        when systems.presentation_kind = 'guided_demo' then
          case when localization.locale = 'fr' then 'Démonstrateur d ingénierie' else 'Engineering demonstrator' end
        when systems.presentation_kind = 'interactive_entry' then
          case when localization.locale = 'fr' then 'Application portfolio' else 'Portfolio application' end
        when systems.evidence_policy = 'documented_only' then
          case when localization.locale = 'fr' then 'Système produit documenté' else 'Documented product system' end
        else
          case when localization.locale = 'fr' then 'Étude de système' else 'System case study' end
      end,
      proof_maturity = case
        when systems.presentation_kind = 'guided_demo' then
          case when localization.locale = 'fr' then 'Démonstrateur inspectable' else 'Inspectable demonstrator' end
        when systems.presentation_kind = 'interactive_entry' then
          case when localization.locale = 'fr' then 'Version portfolio publique' else 'Public portfolio release' end
        when systems.evidence_policy = 'documented_only' then
          case when localization.locale = 'fr' then 'Implémenté ; déploiement client non prouvé' else 'Implemented; customer deployment not evidenced' end
        else
          case when localization.locale = 'fr' then 'Implémentation inspectable' else 'Inspectable implementation' end
      end,
      proof_demo_nature = case
        when systems.presentation_kind = 'guided_demo' then
          case when localization.locale = 'fr' then 'Démo publique synthétique et isolée' else 'Isolated synthetic public demo' end
        when systems.presentation_kind = 'interactive_entry' then
          case when localization.locale = 'fr' then 'Application portfolio publique' else 'Public portfolio application' end
        when systems.evidence_policy = 'documented_only' then
          case when localization.locale = 'fr' then 'Aucune démo publique prouvée' else 'No public demo evidenced' end
        else
          case when localization.locale = 'fr' then 'Aucune démo séparée' else 'No separate public demo' end
      end,
      proof_data_nature = case
        when systems.presentation_kind = 'guided_demo' then
          case when localization.locale = 'fr' then 'Données de démonstration synthétiques' else 'Synthetic demonstration data' end
        when systems.presentation_kind = 'interactive_entry' then
          case when localization.locale = 'fr' then 'Données portfolio fictives' else 'Fictional portfolio data' end
        when systems.evidence_policy = 'documented_only' then
          case when localization.locale = 'fr' then 'Données de référence et preuves du dépôt' else 'Reference data and repository evidence' end
        else
          case when localization.locale = 'fr' then 'Contexte réel ; aucune donnée client exposée' else 'Real-world context; no customer data exposed' end
      end,
      proof_limits = case
        when systems.presentation_kind = 'guided_demo' then
          case when localization.locale = 'fr' then 'La démonstration ne prouve ni déploiement industriel ni impact métier mesuré.' else 'The demonstration does not prove industrial deployment or measured business impact.' end
        when systems.presentation_kind = 'interactive_entry' then
          case when localization.locale = 'fr' then 'La version publique reste une démonstration portfolio et ne doit pas être lue comme un service réel.' else 'The public release remains a portfolio demonstration and must not be read as a real operating service.' end
        when systems.evidence_policy = 'documented_only' then
          case when localization.locale = 'fr' then 'Seules les preuves documentées sont exposées ; aucun déploiement client actif n est affirmé.' else 'Only documented evidence is exposed; no active customer deployment is claimed.' end
        else
          case when localization.locale = 'fr' then 'Le contexte d origine ne constitue pas à lui seul une preuve de déploiement actuel ou de données opérationnelles publiques.' else 'Origin context alone is not evidence of current deployment or publicly exposed operational data.' end
      end
    from systems
    where systems.id = localization.system_id
  `.execute(db);

  await sql`
    alter table system_localizations
    drop constraint if exists system_localizations_publication_readiness_check
  `.execute(db);

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
        and proof_role is not null
        and length(trim(proof_role)) > 0
        and proof_maturity is not null
        and length(trim(proof_maturity)) > 0
        and proof_demo_nature is not null
        and length(trim(proof_demo_nature)) > 0
        and proof_data_nature is not null
        and length(trim(proof_data_nature)) > 0
        and proof_limits is not null
        and length(trim(proof_limits)) > 0
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

  await db.schema
    .alterTable('system_localizations')
    .dropColumn('proof_limits')
    .dropColumn('proof_data_nature')
    .dropColumn('proof_demo_nature')
    .dropColumn('proof_maturity')
    .dropColumn('proof_role')
    .execute();
}
