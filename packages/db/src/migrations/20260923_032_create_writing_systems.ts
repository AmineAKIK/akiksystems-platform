import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('writing_systems')
    .addColumn('writing_id', 'uuid', (column) =>
      column.notNull().references('writings.id').onDelete('cascade'),
    )
    .addColumn('system_id', 'uuid', (column) =>
      column.notNull().references('systems.id').onDelete('cascade'),
    )
    .addColumn('position', 'integer', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('writing_systems_pkey', ['writing_id', 'system_id'])
    .addUniqueConstraint('writing_systems_writing_position_key', [
      'writing_id',
      'position',
    ])
    .addCheckConstraint('writing_systems_position_check', sql`position >= 0`)
    .execute();

  await db.schema
    .createIndex('writing_systems_system_idx')
    .on('writing_systems')
    .columns(['system_id', 'writing_id'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('writing_systems').execute();
}
