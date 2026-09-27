import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table if exists work_with_us_inquiries
      drop column if exists handled_at
  `.execute(db);

  await sql`drop table if exists admin_audit_events cascade`.execute(db);
  await sql`drop function if exists prevent_admin_audit_event_mutation()`.execute(db);

  await sql`
    do $cleanup$
    declare
      auth_table record;
    begin
      for auth_table in
        select tablename
        from pg_tables
        where schemaname = 'public'
          and lower(tablename) in (
            'user',
            'session',
            'account',
            'verification',
            'twofactor',
            'ratelimit'
          )
      loop
        execute format(
          'drop table if exists public.%I cascade',
          auth_table.tablename
        );
      end loop;
    end
    $cleanup$
  `.execute(db);
}

export async function down(): Promise<void> {
  throw new Error(
    'The back-office removal migration is intentionally irreversible. Restore through Git history if the control plane is ever reintroduced.',
  );
}
