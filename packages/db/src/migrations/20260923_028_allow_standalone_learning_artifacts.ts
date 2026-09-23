import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('learning_artifacts')
    .alterColumn('training_id', (column) => column.dropNotNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('learning_artifacts')
    .alterColumn('training_id', (column) => column.setNotNull())
    .execute();
}
