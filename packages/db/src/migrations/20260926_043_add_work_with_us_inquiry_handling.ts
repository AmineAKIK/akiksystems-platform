import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('work_with_us_inquiries')
    .addColumn('handled_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('work_with_us_inquiry_settings')
    .addColumn('singleton_key', 'text', (column) =>
      column.primaryKey().defaultTo('public'),
    )
    .addColumn('recipient_email', 'text')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'work_with_us_inquiry_settings_singleton_check',
      sql`singleton_key = 'public'`,
    )
    .addCheckConstraint(
      'work_with_us_inquiry_settings_recipient_check',
      sql`recipient_email is null or (
        char_length(recipient_email) between 3 and 254
        and recipient_email !~ '[[:space:]]'
        and recipient_email like '%@%'
      )`,
    )
    .execute();

  await db.schema
    .createTable('work_with_us_inquiry_notifications')
    .addColumn('inquiry_id', 'uuid', (column) =>
      column
        .primaryKey()
        .references('work_with_us_inquiries.id')
        .onDelete('cascade'),
    )
    .addColumn('state', 'text', (column) =>
      column.notNull().defaultTo('pending'),
    )
    .addColumn('recipient_email', 'text')
    .addColumn('attempt_count', 'integer', (column) =>
      column.notNull().defaultTo(0),
    )
    .addColumn('provider', 'text')
    .addColumn('provider_message_id', 'text')
    .addColumn('last_error', 'text')
    .addColumn('queued_at', 'timestamptz')
    .addColumn('sent_at', 'timestamptz')
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'work_with_us_inquiry_notifications_state_check',
      sql`state in ('pending', 'queued', 'sending', 'sent', 'failed', 'blocked')`,
    )
    .addCheckConstraint(
      'work_with_us_inquiry_notifications_attempt_count_check',
      sql`attempt_count >= 0`,
    )
    .addCheckConstraint(
      'work_with_us_inquiry_notifications_recipient_check',
      sql`recipient_email is null or char_length(recipient_email) <= 254`,
    )
    .execute();

  await sql`
    insert into work_with_us_inquiry_notifications (inquiry_id)
    select id
    from work_with_us_inquiries
    on conflict (inquiry_id) do nothing
  `.execute(db);

  await sql`
    create index work_with_us_inquiries_handling_idx
      on work_with_us_inquiries (handled_at nulls first, created_at desc)
  `.execute(db);

  await sql`
    create index work_with_us_inquiry_notifications_state_idx
      on work_with_us_inquiry_notifications (state, updated_at)
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('work_with_us_inquiry_notifications').execute();
  await db.schema.dropTable('work_with_us_inquiry_settings').execute();
  await db.schema
    .alterTable('work_with_us_inquiries')
    .dropColumn('handled_at')
    .execute();
}
