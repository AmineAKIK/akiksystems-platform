import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table profiles
    add column if not exists systemic_scale_writing_id uuid
    references writings(id) on delete set null
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    alter table profiles
    drop column if exists systemic_scale_writing_id
  `.execute(db);
}
