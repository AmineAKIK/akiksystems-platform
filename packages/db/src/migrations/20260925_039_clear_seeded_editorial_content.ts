import { sql, type Kysely } from 'kysely';

/**
 * Establishes an intentionally empty editorial baseline.
 *
 * Authentication, sessions, rate limits, migration history and the append-only
 * admin audit trail are deliberately outside this boundary. The empty Profile
 * singleton and its EN/FR localization rows remain because the administration
 * edits that singleton in place.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    delete from work_with_us_pages;

    delete from writings;
    delete from categories;
    delete from tags;

    delete from learning_artifacts;
    delete from credentials;
    delete from trainings;

    delete from profile_publications;
    delete from profile_contacts;
    delete from profile_languages;
    delete from profile_stack_groups;

    update profiles
    set
      display_name = null,
      portrait_asset_id = null,
      source_cv_asset_id = null,
      current_system_id = null,
      systemic_scale_writing_id = null,
      updated_at = now()
    where singleton_key = 'public';

    update profile_localizations
    set
      content = '{}'::jsonb,
      editorial_state = 'draft',
      published_at = null,
      updated_at = now();

    update profile_mobility
    set
      worldwide = false,
      remote = false,
      relocation = false,
      updated_at = now();

    delete from systems;
    delete from technologies;
    delete from experiences;
    delete from assets;
  `.execute(db);
}

/**
 * Deleted editorial content cannot be reconstructed honestly by a rollback.
 * Restoring it requires an explicit database/object-storage backup.
 */
export async function down(_db: Kysely<unknown>): Promise<void> {}
