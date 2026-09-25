import { sql, type Kysely } from 'kysely';

/**
 * One-time editorial reset requested before production authoring begins.
 *
 * This migration deliberately preserves:
 * - schema and migration history
 * - Better Auth tables
 * - admin audit history
 * - the migration-owned public Profile singleton + EN/FR localization rows
 * - legal-page structural identities + EN/FR localization rows
 *
 * Everything that can surface as authored/public content is removed or nulled.
 * Future deploys must never repopulate it automatically.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Preserve the Profile singleton required by /admin/profile, but remove all copy/media/public snapshots.
  await sql`delete from profile_publications`.execute(db);
  await sql`delete from profile_work_principle_localizations`.execute(db);
  await sql`delete from profile_work_principles`.execute(db);
  await sql`delete from profile_capability_localizations`.execute(db);
  await sql`delete from profile_capabilities`.execute(db);
  await sql`delete from profile_capability_group_localizations`.execute(db);
  await sql`delete from profile_capability_groups`.execute(db);
  await sql`delete from profile_languages`.execute(db);
  await sql`delete from profile_mobility`.execute(db);
  await sql`delete from profile_technology_journey_stage_localizations`.execute(db);
  await sql`delete from profile_technology_journey_stages`.execute(db);
  await sql`delete from profile_experiences`.execute(db);
  await sql`delete from profile_systems`.execute(db);

  await sql`
    update profile_localizations
    set
      professional_title = null,
      introduction = null,
      foundational_copy = null,
      updated_at = now()
  `.execute(db);

  await sql`
    update profiles
    set
      display_name = null,
      portrait_asset_id = null,
      source_cv_asset_id = null,
      updated_at = now()
  `.execute(db);

  // Work with us is an admin-created singleton. Remove drafts and snapshots entirely.
  await sql`delete from work_with_us_publications`.execute(db);
  await sql`delete from work_with_us_localizations`.execute(db);
  await sql`delete from work_with_us_pages`.execute(db);

  // Legal page identities are structural; keep them, but clear all authored copy/publication.
  await sql`delete from legal_page_publications`.execute(db);
  await sql`
    update legal_page_localizations
    set
      title = null,
      editor_document = null,
      editorial_state = 'draft',
      published_at = null,
      updated_at = now()
  `.execute(db);

  // Writings and their classification/reference data.
  await sql`delete from writing_assets`.execute(db);
  await sql`delete from writing_systems`.execute(db);
  await sql`delete from writing_tags`.execute(db);
  await sql`delete from writing_categories`.execute(db);
  await sql`delete from writing_publications`.execute(db);
  await sql`delete from writing_localizations`.execute(db);
  await sql`delete from writings`.execute(db);
  await sql`delete from category_publications`.execute(db);
  await sql`delete from category_localizations`.execute(db);
  await sql`delete from categories`.execute(db);
  await sql`delete from tag_publications`.execute(db);
  await sql`delete from tag_localizations`.execute(db);
  await sql`delete from tags`.execute(db);

  // Learning content.
  await sql`delete from learning_artifact_publications`.execute(db);
  await sql`delete from learning_artifact_localizations`.execute(db);
  await sql`delete from learning_artifacts`.execute(db);
  await sql`delete from credential_publications`.execute(db);
  await sql`delete from credential_localizations`.execute(db);
  await sql`delete from credentials`.execute(db);
  await sql`delete from training_publications`.execute(db);
  await sql`delete from training_localizations`.execute(db);
  await sql`delete from trainings`.execute(db);

  // Systems and all public evidence/reference material.
  await sql`delete from system_links`.execute(db);
  await sql`delete from system_assets`.execute(db);
  await sql`delete from system_experiences`.execute(db);
  await sql`delete from system_technologies`.execute(db);
  await sql`delete from system_publications`.execute(db);
  await sql`delete from system_localizations`.execute(db);
  await sql`delete from systems`.execute(db);

  // Orphanable supporting editorial entities.
  await sql`delete from experience_localizations`.execute(db);
  await sql`delete from experiences`.execute(db);
  await sql`delete from technologies`.execute(db);
  await sql`delete from asset_localizations`.execute(db);
  await sql`delete from assets`.execute(db);
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // Intentionally irreversible: deleted editorial content must never be fabricated on rollback.
}
