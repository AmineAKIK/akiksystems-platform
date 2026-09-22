import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('systems')
    .addColumn('editorial_position', 'integer', (column) =>
      column.notNull().defaultTo(0),
    )
    .addColumn('featured', 'boolean', (column) =>
      column.notNull().defaultTo(false),
    )
    .execute();

  await sql`
    with ordered as (
      select
        id,
        row_number() over (order by created_at, id) - 1 as editorial_position
      from systems
    )
    update systems
    set editorial_position = ordered.editorial_position
    from ordered
    where systems.id = ordered.id
  `.execute(db);

  await db.schema
    .alterTable('systems')
    .addCheckConstraint(
      'systems_editorial_position_check',
      sql`editorial_position >= 0`,
    )
    .execute();

  await db.schema
    .createIndex('systems_editorial_order_idx')
    .on('systems')
    .columns(['editorial_position', 'created_at'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('systems_editorial_order_idx').execute();
  await db.schema
    .alterTable('systems')
    .dropConstraint('systems_editorial_position_check')
    .execute();

  await db.schema
    .alterTable('systems')
    .dropColumn('featured')
    .dropColumn('editorial_position')
    .execute();
}
