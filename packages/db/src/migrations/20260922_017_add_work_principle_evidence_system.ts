import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('profile_work_principles')
    .addColumn('evidence_system_id', 'uuid', (column) =>
      column.references('systems.id').onDelete('set null'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('profile_work_principles')
    .dropColumn('evidence_system_id')
    .execute();
}
