import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('work_with_us_inquiries')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('submission_token', 'uuid', (column) =>
      column.notNull().unique(),
    )
    .addColumn('locale', 'text', (column) => column.notNull())
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('email', 'text', (column) => column.notNull())
    .addColumn('organization', 'text')
    .addColumn('message', 'text', (column) => column.notNull())
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'work_with_us_inquiries_locale_check',
      sql`locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'work_with_us_inquiries_name_check',
      sql`char_length(name) <= 120 and name ~ '[^[:space:]]'`,
    )
    .addCheckConstraint(
      'work_with_us_inquiries_email_check',
      sql`char_length(email) between 3 and 254 and email !~ '[[:space:]]'`,
    )
    .addCheckConstraint(
      'work_with_us_inquiries_organization_check',
      sql`organization is null or (char_length(organization) <= 160 and organization ~ '[^[:space:]]')`,
    )
    .addCheckConstraint(
      'work_with_us_inquiries_message_check',
      sql`char_length(message) <= 5000 and message ~ '[^[:space:]]'`,
    )
    .execute();

  await sql`
    create index work_with_us_inquiries_email_created_at_idx
      on work_with_us_inquiries (lower(email), created_at desc)
  `.execute(db);

  await sql`
    create index work_with_us_inquiries_created_at_idx
      on work_with_us_inquiries (created_at desc)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('work_with_us_inquiries').execute();
}
