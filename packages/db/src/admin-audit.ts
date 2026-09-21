import { randomUUID } from 'node:crypto';

import type { Kysely, Transaction } from 'kysely';

import type { Database } from './schema.js';

export type AdminAuditMetadata = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

export interface AdminAuditEventInput {
  actorUserId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  systemId?: string | null;
  locale?: 'en' | 'fr' | null;
  metadata?: AdminAuditMetadata;
}

export async function writeAdminAuditEvent(
  db: Kysely<Database> | Transaction<Database>,
  event: AdminAuditEventInput,
): Promise<void> {
  await db
    .insertInto('admin_audit_events')
    .values({
      id: randomUUID(),
      actor_user_id: event.actorUserId,
      actor_email: event.actorEmail.trim().toLowerCase(),
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      system_id: event.systemId ?? null,
      locale: event.locale ?? null,
      metadata: event.metadata ?? {},
    })
    .execute();
}
