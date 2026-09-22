import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('systems')
    .addColumn('presentation_kind', 'text', (column) =>
      column.notNull().defaultTo('standard'),
    )
    .execute();

  await db.schema
    .alterTable('systems')
    .addCheckConstraint(
      'systems_presentation_kind_check',
      sql`presentation_kind in ('standard', 'guided_demo', 'interactive_entry')`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('systems')
    .dropConstraint('systems_presentation_kind_check')
    .execute();

  await db.schema
    .alterTable('systems')
    .dropColumn('presentation_kind')
    .execute();
}
