import { type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('profiles')
    .addColumn('systemic_scale_writing_id', 'uuid', (column) =>
      column.references('writings.id').onDelete('set null'),
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('profiles').dropColumn('systemic_scale_writing_id').execute();
}
