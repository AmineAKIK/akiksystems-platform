import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import {
  createWorkWithUsInquiry,
  ensureWorkWithUsInquirySettings,
  listWorkWithUsInquiries,
  markWorkWithUsInquiryNotificationBlocked,
  markWorkWithUsInquiryNotificationFailed,
  markWorkWithUsInquiryNotificationQueued,
  markWorkWithUsInquiryNotificationSending,
  markWorkWithUsInquiryNotificationSent,
  resetWorkWithUsInquiryNotification,
  setWorkWithUsInquiryHandled,
  updateWorkWithUsInquiryRecipient,
} from '../index.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const marker = randomUUID();
const email = `handling-${marker}@example.invalid`;
const initialRecipient = `recipient-${marker}@example.invalid`;
const updatedRecipient = `updated-${marker}@example.invalid`;

const previousSettings = await db
  .selectFrom('work_with_us_inquiry_settings')
  .select(['singleton_key', 'recipient_email'])
  .where('singleton_key', '=', 'public')
  .executeTakeFirst();

let inquiryId: string | null = null;

try {
  const settings = await ensureWorkWithUsInquirySettings(db, initialRecipient);
  if (previousSettings === undefined) {
    assert.equal(settings.recipientEmail, initialRecipient);
  }

  await updateWorkWithUsInquiryRecipient(db, updatedRecipient);

  const created = await createWorkWithUsInquiry(db, {
    submissionToken: randomUUID(),
    locale: 'fr',
    name: 'Qualification traitement',
    email,
    organization: null,
    message: 'Une demande doit rester traitable même si la notification échoue.',
  });

  assert.equal(created.status, 'created');
  if (created.status !== 'created') {
    throw new Error('Handling qualification inquiry was not created.');
  }
  inquiryId = created.inquiryId;

  let inbox = await listWorkWithUsInquiries(db);
  let item = inbox.find((candidate) => candidate.id === inquiryId);
  assert.ok(item);
  assert.equal(item.handledAt, null);
  assert.equal(item.notification.state, 'pending');
  assert.equal(item.notification.attemptCount, 0);

  assert.equal(await setWorkWithUsInquiryHandled(db, inquiryId, true), true);
  inbox = await listWorkWithUsInquiries(db);
  item = inbox.find((candidate) => candidate.id === inquiryId);
  assert.ok(item?.handledAt instanceof Date);

  assert.equal(await setWorkWithUsInquiryHandled(db, inquiryId, false), true);
  await markWorkWithUsInquiryNotificationQueued(db, inquiryId);
  await markWorkWithUsInquiryNotificationSending(
    db,
    inquiryId,
    updatedRecipient,
    'qualification',
  );
  await markWorkWithUsInquiryNotificationFailed(
    db,
    inquiryId,
    'Synthetic provider outage.',
  );

  inbox = await listWorkWithUsInquiries(db);
  item = inbox.find((candidate) => candidate.id === inquiryId);
  assert.equal(item?.notification.state, 'failed');
  assert.equal(item?.notification.attemptCount, 1);
  assert.equal(item?.notification.lastError, 'Synthetic provider outage.');

  assert.equal(await resetWorkWithUsInquiryNotification(db, inquiryId), true);
  await markWorkWithUsInquiryNotificationBlocked(
    db,
    inquiryId,
    'Synthetic missing transport.',
  );
  assert.equal(await resetWorkWithUsInquiryNotification(db, inquiryId), true);

  await markWorkWithUsInquiryNotificationSending(
    db,
    inquiryId,
    updatedRecipient,
    'qualification',
  );
  await markWorkWithUsInquiryNotificationSent(
    db,
    inquiryId,
    'qualification',
    `message-${marker}`,
  );

  inbox = await listWorkWithUsInquiries(db);
  item = inbox.find((candidate) => candidate.id === inquiryId);
  assert.equal(item?.notification.state, 'sent');
  assert.equal(item?.notification.attemptCount, 2);
  assert.equal(item?.notification.recipientEmail, updatedRecipient);
  assert.equal(item?.notification.provider, 'qualification');
  assert.equal(item?.notification.providerMessageId, `message-${marker}`);
  assert.ok(item?.notification.sentAt instanceof Date);
  assert.equal(await resetWorkWithUsInquiryNotification(db, inquiryId), false);

  process.stdout.write(
    'Work with us inquiry handling qualification passed: inbox state, recipient administration, retryable notification state, and handled/reopened lifecycle remain independent.\n',
  );
} finally {
  if (inquiryId !== null) {
    await db
      .deleteFrom('work_with_us_inquiries')
      .where('id', '=', inquiryId)
      .execute();
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
