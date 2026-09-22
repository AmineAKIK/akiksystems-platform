import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('systems')
    .addColumn('evidence_policy', 'text', (column) =>
      column.notNull().defaultTo('all_supported'),
    )
    .execute();

  await db.schema
    .alterTable('systems')
    .addCheckConstraint(
      'systems_evidence_policy_check',
      sql`evidence_policy in ('all_supported', 'documented_only')`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('systems')
    .dropConstraint('systems_evidence_policy_check')
    .execute();

  await db.schema
    .alterTable('systems')
    .dropColumn('evidence_policy')
    .execute();
}
