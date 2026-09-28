import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  createWorkWithUsInquiry,
  ensureWorkWithUsInquirySettings,
  getWorkWithUsInquiryNotificationDelivery,
  markWorkWithUsInquiryNotificationBlocked,
  markWorkWithUsInquiryNotificationFailed,
  markWorkWithUsInquiryNotificationQueued,
  markWorkWithUsInquiryNotificationSending,
  markWorkWithUsInquiryNotificationSent,
} from '../index.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const marker = randomUUID();
const email = `delivery-${marker}@example.invalid`;
const recipient = `recipient-${marker}@example.invalid`;

const previousSettings = await db
  .selectFrom('work_with_us_inquiry_settings')
  .select(['singleton_key', 'recipient_email'])
  .where('singleton_key', '=', 'public')
  .executeTakeFirst();

let inquiryId: string | null = null;

try {
  await ensureWorkWithUsInquirySettings(db, recipient);

  const created = await createWorkWithUsInquiry(db, {
    submissionToken: randomUUID(),
    locale: 'fr',
    name: 'Qualification livraison',
    email,
    organization: null,
    message: 'Une demande publique doit rester livrable sans back-office.',
  });

  assert.equal(created.status, 'created');
  if (created.status !== 'created') {
    throw new Error('Notification qualification inquiry was not created.');
  }

  inquiryId = created.inquiryId;

  let delivery = await getWorkWithUsInquiryNotificationDelivery(db, inquiryId);
  assert.ok(delivery);
  assert.equal(delivery.state, 'pending');
  assert.equal(delivery.recipientEmail, previousSettings?.recipient_email ?? recipient);

  await markWorkWithUsInquiryNotificationQueued(db, inquiryId);
  await markWorkWithUsInquiryNotificationSending(
    db,
    inquiryId,
    delivery.recipientEmail ?? recipient,
    'qualification',
  );
  await markWorkWithUsInquiryNotificationFailed(db, inquiryId, 'Synthetic provider outage.');

  const notification = await db
    .selectFrom('work_with_us_inquiry_notifications')
    .select(['state', 'attempt_count', 'last_error'])
    .where('inquiry_id', '=', inquiryId)
    .executeTakeFirstOrThrow();

  assert.equal(notification.state, 'failed');
  assert.equal(notification.attempt_count, 1);
  assert.equal(notification.last_error, 'Synthetic provider outage.');

  await markWorkWithUsInquiryNotificationBlocked(db, inquiryId, 'Synthetic missing transport.');
  await markWorkWithUsInquiryNotificationSending(
    db,
    inquiryId,
    delivery.recipientEmail ?? recipient,
    'qualification',
  );
  await markWorkWithUsInquiryNotificationSent(db, inquiryId, 'qualification', `message-${marker}`);

  delivery = await getWorkWithUsInquiryNotificationDelivery(db, inquiryId);
  assert.ok(delivery);
  assert.equal(delivery.state, 'sent');
  assert.equal(delivery.providerMessageId, `message-${marker}`);

  const sentNotification = await db
    .selectFrom('work_with_us_inquiry_notifications')
    .select(['state', 'attempt_count', 'provider_message_id', 'sent_at'])
    .where('inquiry_id', '=', inquiryId)
    .executeTakeFirstOrThrow();

  assert.equal(sentNotification.state, 'sent');
  assert.equal(sentNotification.attempt_count, 2);
  assert.equal(sentNotification.provider_message_id, `message-${marker}`);
  assert.ok(sentNotification.sent_at instanceof Date);

  process.stdout.write(
    'Work with us notification qualification passed: public inquiry delivery remains durable without any administration lifecycle.\n',
  );
} finally {
  if (inquiryId !== null) {
    await db.deleteFrom('work_with_us_inquiries').where('id', '=', inquiryId).execute();
  }

  if (previousSettings === undefined) {
    await db
      .deleteFrom('work_with_us_inquiry_settings')
      .where('singleton_key', '=', 'public')
      .execute();
  } else {
    await db
      .updateTable('work_with_us_inquiry_settings')
      .set({
        recipient_email: previousSettings.recipient_email,
        updated_at: new Date(),
      })
      .where('singleton_key', '=', 'public')
      .execute();
  }

  await db.destroy();
}
