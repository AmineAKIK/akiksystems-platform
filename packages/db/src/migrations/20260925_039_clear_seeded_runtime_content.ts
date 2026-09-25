import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`delete from profile_publications`.execute(db);
  await sql`delete from work_with_us_publications`.execute(db);

  await sql`
    update profiles
    set display_name = null,
        portrait_asset_id = null,
        source_cv_asset_id = null,
        updated_at = now()
    where singleton_key = 'public'
  `.execute(db);

  await sql`
    update profile_localizations
    set professional_title = null,
        introduction = null,
        foundational_copy = null,
        updated_at = now()
  `.execute(db);

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
    update work_with_us_localizations
    set title = null,
        introduction = null,
        situations_title = null,
        situations_body = null,
        capabilities_title = null,
        capabilities_body = null,
        collaboration_title = null,
        collaboration_body = null,
        inquiry_title = null,
        inquiry_body = null,
        privacy_note = null,
        editorial_state = 'draft',
        published_at = null,
        updated_at = now()
  `.execute(db);

  await sql`
    truncate table
      systems,
      trainings,
      credentials,
      learning_artifacts,
      writings,
      categories,
      tags,
      experiences,
      technologies
    restart identity cascade
  `.execute(db);

  // Assets are deleted after every editorial reference has been removed.
  // DELETE is intentional here: TRUNCATE ... CASCADE would also truncate the
  // Profile singleton table because it owns nullable asset foreign keys.
  await sql`delete from assets`.execute(db);
}

export async function down(): Promise<void> {
  // Deliberately irreversible: removed editorial content is never rebuilt from code.
}
