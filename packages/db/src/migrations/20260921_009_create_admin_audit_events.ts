import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('admin_audit_events')
    .addColumn('id', 'uuid', (column) => column.primaryKey())
    .addColumn('actor_user_id', 'text', (column) => column.notNull())
    .addColumn('actor_email', 'text', (column) => column.notNull())
    .addColumn('action', 'text', (column) => column.notNull())
    .addColumn('entity_type', 'text', (column) => column.notNull())
    .addColumn('entity_id', 'text', (column) => column.notNull())
    .addColumn('system_id', 'uuid')
    .addColumn('locale', 'text')
    .addColumn('metadata', 'jsonb', (column) =>
      column.notNull().defaultTo(sql`'{}'::jsonb`),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'admin_audit_events_locale_check',
      sql`locale is null or locale in ('en', 'fr')`,
    )
    .addCheckConstraint(
      'admin_audit_events_action_check',
      sql`length(trim(action)) > 0`,
    )
    .addCheckConstraint(
      'admin_audit_events_entity_check',
      sql`length(trim(entity_type)) > 0 and length(trim(entity_id)) > 0`,
    )
    .addCheckConstraint(
      'admin_audit_events_metadata_object_check',
      sql`jsonb_typeof(metadata) = 'object'`,
    )
    .execute();

  await db.schema
    .createIndex('admin_audit_events_system_created_idx')
    .on('admin_audit_events')
    .columns(['system_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('admin_audit_events_actor_created_idx')
    .on('admin_audit_events')
    .columns(['actor_user_id', 'created_at'])
    .execute();

  await sql`
    create function prevent_admin_audit_event_mutation()
    returns trigger
    language plpgsql
    as $
    begin
      raise exception 'admin audit events are append-only';
    end;
    $
  `.execute(db);

  await sql`
    create trigger admin_audit_events_no_update
    before update on admin_audit_events
    for each row execute function prevent_admin_audit_event_mutation()
  `.execute(db);

  await sql`
    create trigger admin_audit_events_no_delete
    before delete on admin_audit_events
    for each row execute function prevent_admin_audit_event_mutation()
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('admin_audit_events').execute();
  await sql`drop function if exists prevent_admin_audit_event_mutation()`.execute(
    db,
  );
}
