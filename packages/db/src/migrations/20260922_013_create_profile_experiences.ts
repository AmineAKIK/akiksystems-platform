import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_experiences')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('experience_id', 'uuid', (column) =>
      column.notNull().references('experiences.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_experiences_pkey', [
      'profile_id',
      'experience_id',
    ])
    .addUniqueConstraint('profile_experiences_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint('profile_experiences_position_check', sql`position >= 0`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_experiences').execute();
}
