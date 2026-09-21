import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('profile_systems')
    .addColumn('profile_id', 'uuid', (column) =>
      column.notNull().references('profiles.id').onDelete('cascade'),
    )
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('profile_systems_pkey', ['profile_id', 'system_id'])
    .addUniqueConstraint('profile_systems_profile_position_key', [
      'profile_id',
      'position',
    ])
    .addCheckConstraint('profile_systems_position_check', sql`position >= 0`)
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('profile_systems').execute();
}
