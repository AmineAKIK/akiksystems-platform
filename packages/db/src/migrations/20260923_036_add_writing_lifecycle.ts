import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('writings')
    .addColumn('lifecycle', 'text', (column) =>
      column.notNull().defaultTo('active'),
    )
    .addColumn('archived_at', 'timestamptz')
    .execute();

  await db.schema
    .alterTable('writings')
    .addCheckConstraint(
      'writings_lifecycle_archive_check',
      sql`
        (lifecycle = 'active' and archived_at is null)
        or (lifecycle = 'archived' and archived_at is not null)
      `,
    )
    .execute();

  await db.schema
    .alterTable('writings')
    .addCheckConstraint(
      'writings_lifecycle_check',
      sql`lifecycle in ('active', 'archived')`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('writings')
    .dropConstraint('writings_lifecycle_archive_check')
    .execute();

  await db.schema
    .alterTable('writings')
    .dropConstraint('writings_lifecycle_check')
    .execute();

  await db.schema
    .alterTable('writings')
    .dropColumn('archived_at')
    .dropColumn('lifecycle')
    .execute();
}
