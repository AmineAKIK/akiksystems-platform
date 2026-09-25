import { sql, type Kysely } from 'kysely';

/**
 * One-shot editorial reset.
 *
 * This migration intentionally removes seeded/demo/editorial content while
 * preserving schema, authentication tables and the empty public Profile
 * singleton required by private administration.
 *
 * It is intentionally irreversible: deleted editorial content must not be
 * recreated by a down migration.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    -- Preserve the Profile skeleton, but detach any stored media first.
    update profiles
    set
      display_name = null,
      portrait_asset_id = null,
      source_cv_asset_id = null,
      updated_at = now();

    update profile_localizations
    set
      professional_title = null,
      introduction = null,
      foundational_copy = null,
      updated_at = now();

    -- Remove every public snapshot before deleting authored entities.
    delete from profile_publications;
    delete from work_with_us_publications;
    delete from writing_publications;
    delete from category_publications;
    delete from tag_publications;
    delete from learning_artifact_publications;
    delete from credential_publications;
    delete from training_publications;
    delete from system_publications;

    -- Remove Profile-authored subcontent but keep the singleton/locales empty.
    delete from profile_work_principles;
    delete from profile_capability_groups;
    delete from profile_languages;
    delete from profile_mobility;
    delete from profile_technology_journey_stages;
    delete from profile_experiences;
    delete from profile_systems;

    -- Work with us is recreated as an empty structural page by admin on demand.
    delete from work_with_us_localizations;
    delete from work_with_us_pages;

    -- Writings and their taxonomies/relations.
    delete from writing_assets;
    delete from writing_categories;
    delete from writing_tags;
    delete from writing_systems;
    delete from writing_localizations;
    delete from writings;
    delete from category_localizations;
    delete from categories;
    delete from tag_localizations;
    delete from tags;

    -- Learning content. Learning artifacts must go before trainings because
    -- older schemas used a restrictive training relation.
    delete from learning_artifact_localizations;
    delete from learning_artifacts;
    delete from credential_localizations;
    delete from credentials;
    delete from training_localizations;
    delete from trainings;

    -- Systems and all related evidence/context.
    delete from system_links;
    delete from system_assets;
    delete from system_experiences;
    delete from system_technologies;
    delete from system_localizations;
    delete from systems;

    delete from experience_localizations;
    delete from experiences;
    delete from technologies;

    -- Media rows are now unreferenced. Object storage is handled separately.
    delete from asset_localizations;
    delete from assets;

    -- Bootstrap keys and old editorial audit history must not point at content
    -- that no longer exists.
    delete from system_metadata;
    delete from admin_audit_events;
  `.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Irreversible by design. A reset migration must never recreate deleted copy.
}
