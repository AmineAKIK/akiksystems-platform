import type { PlatformLocale } from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database, WorkWithUsInquiryNotificationState } from './schema.js';

export type { WorkWithUsInquiryNotificationState } from './schema.js';

export interface WorkWithUsInquirySettings {
  recipientEmail: string | null;
}

export interface WorkWithUsInquiryNotificationDelivery {
  inquiryId: string;
  locale: PlatformLocale;
  name: string;
  email: string;
  organization: string | null;
  message: string;
  createdAt: Date;
  state: WorkWithUsInquiryNotificationState;
  recipientEmail: string | null;
  providerMessageId: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function ensureWorkWithUsInquirySettings(
  db: Kysely<Database>,
  defaultRecipientEmail: string,
): Promise<WorkWithUsInquirySettings> {
  const recipientEmail = normalizeEmail(defaultRecipientEmail);

  await db
    .insertInto('work_with_us_inquiry_settings')
    .values({
      singleton_key: 'public',
      recipient_email: recipientEmail,
    })
    .onConflict((conflict) => conflict.column('singleton_key').doNothing())
    .execute();

  return getWorkWithUsInquirySettings(db);
}

export async function getWorkWithUsInquirySettings(
  db: Kysely<Database>,
): Promise<WorkWithUsInquirySettings> {
  const row = await db
    .selectFrom('work_with_us_inquiry_settings')
    .select('recipient_email')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  return {
    recipientEmail: row?.recipient_email ?? null,
  };
}

export async function getWorkWithUsInquiryNotificationDelivery(
  db: Kysely<Database>,
  inquiryId: string,
): Promise<WorkWithUsInquiryNotificationDelivery | null> {
  const row = await db
    .selectFrom('work_with_us_inquiries as inquiry')
    .innerJoin(
      'work_with_us_inquiry_notifications as notification',
      'notification.inquiry_id',
      'inquiry.id',
    )
    .leftJoin('work_with_us_inquiry_settings as settings', (join) =>
      join.on('settings.singleton_key', '=', 'public'),
    )
    .select([
      'inquiry.id',
      'inquiry.locale',
      'inquiry.name',
      'inquiry.email',
      'inquiry.organization',
      'inquiry.message',
      'inquiry.created_at',
      'notification.state as notification_state',
      'notification.recipient_email as notification_recipient_email',
      'notification.provider_message_id as notification_provider_message_id',
      'settings.recipient_email as configured_recipient_email',
    ])
    .where('inquiry.id', '=', inquiryId)
    .executeTakeFirst();

  if (row === undefined) return null;

  return {
    inquiryId: row.id,
    locale: row.locale,
    name: row.name,
    email: row.email,
    organization: row.organization,
    message: row.message,
    createdAt: row.created_at,
    state: row.notification_state as WorkWithUsInquiryNotificationState,
    recipientEmail: row.configured_recipient_email ?? row.notification_recipient_email,
    providerMessageId: row.notification_provider_message_id,
  };
}

export async function markWorkWithUsInquiryNotificationQueued(
  db: Kysely<Database>,
  inquiryId: string,
): Promise<void> {
  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set({
      state: 'queued',
      queued_at: new Date(),
      last_error: null,
      updated_at: new Date(),
    })
    .where('inquiry_id', '=', inquiryId)
    .where('state', '!=', 'sent')
    .execute();
}

export async function markWorkWithUsInquiryNotificationQueueFailed(
  db: Kysely<Database>,
  inquiryId: string,
  errorMessage: string,
): Promise<void> {
  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set({
      state: 'pending',
      last_error: errorMessage,
      updated_at: new Date(),
    })
    .where('inquiry_id', '=', inquiryId)
    .where('state', '!=', 'sent')
    .execute();
}

export async function markWorkWithUsInquiryNotificationSending(
  db: Kysely<Database>,
  inquiryId: string,
  recipientEmail: string,
  provider: string,
): Promise<void> {
  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set((eb) => ({
      state: 'sending',
      recipient_email: normalizeEmail(recipientEmail),
      provider,
      attempt_count: eb('attempt_count', '+', 1),
      last_error: null,
      updated_at: new Date(),
    }))
    .where('inquiry_id', '=', inquiryId)
    .where('state', '!=', 'sent')
    .execute();
}

export async function markWorkWithUsInquiryNotificationSent(
  db: Kysely<Database>,
  inquiryId: string,
  provider: string,
  providerMessageId: string,
): Promise<void> {
  const now = new Date();

  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set({
      state: 'sent',
      provider,
      provider_message_id: providerMessageId,
      last_error: null,
      sent_at: now,
      updated_at: now,
    })
    .where('inquiry_id', '=', inquiryId)
    .execute();
}

export async function markWorkWithUsInquiryNotificationFailed(
  db: Kysely<Database>,
  inquiryId: string,
  errorMessage: string,
): Promise<void> {
  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set({
      state: 'failed',
      last_error: errorMessage,
      updated_at: new Date(),
    })
    .where('inquiry_id', '=', inquiryId)
    .where('state', '!=', 'sent')
    .execute();
}

export async function markWorkWithUsInquiryNotificationBlocked(
  db: Kysely<Database>,
  inquiryId: string,
  reason: string,
): Promise<void> {
  await db
    .updateTable('work_with_us_inquiry_notifications')
    .set({
      state: 'blocked',
      last_error: reason,
      updated_at: new Date(),
    })
    .where('inquiry_id', '=', inquiryId)
    .where('state', '!=', 'sent')
    .execute();
}
