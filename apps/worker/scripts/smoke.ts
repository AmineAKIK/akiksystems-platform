import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { parseWorkerEnv } from '@akiksystems/config/env';
import {
  createDatabase,
  createWorkWithUsInquiry,
  ensureWorkWithUsInquirySettings,
} from '@akiksystems/db';

import { startWorker } from '../src/runtime.js';
import type {
  WorkWithUsEmailMessage,
  WorkWithUsEmailTransport,
} from '../src/work-with-us-email.js';

const env = parseWorkerEnv(process.env);
const probeId = randomUUID();
const inquiryEmail = `worker-smoke-${randomUUID()}@example.invalid`;
const recipientEmail = 'worker-smoke-recipient@example.invalid';
const sentMessages: WorkWithUsEmailMessage[] = [];

const transport: WorkWithUsEmailTransport = {
  provider: 'smoke',
  async send(message) {
    sentMessages.push(message);
    return { messageId: `smoke-${randomUUID()}` };
  },
};

const db = createDatabase(env.DATABASE_URL);
const previousSettings = await db
  .selectFrom('work_with_us_inquiry_settings')
  .select(['singleton_key', 'recipient_email'])
  .where('singleton_key', '=', 'public')
  .executeTakeFirst();

await ensureWorkWithUsInquirySettings(db, recipientEmail);
if (previousSettings !== undefined) {
  await db
    .updateTable('work_with_us_inquiry_settings')
    .set({
      recipient_email: recipientEmail,
      updated_at: new Date(),
    })
    .where('singleton_key', '=', 'public')
    .execute();
}

const inquiry = await createWorkWithUsInquiry(db, {
  submissionToken: randomUUID(),
  locale: 'en',
  name: 'Worker notification smoke',
  email: inquiryEmail,
  organization: 'AkikSystems qualification',
  message: 'The durable inquiry should be delivered by the asynchronous worker.',
});

assert.equal(inquiry.status, 'created');
if (inquiry.status !== 'created') {
  throw new Error('Worker smoke inquiry was not created.');
}

const inquiryId = inquiry.inquiryId;
const runner = await startWorker({
  connectionString: env.DATABASE_URL,
  workWithUsEmailTransport: transport,
});

const completedTasks = new Set<string>();
const completed = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(
      new Error(
        `Timed out waiting for worker smoke tasks. Completed: ${[
          ...completedTasks,
        ].join(', ')}`,
      ),
    );
  }, 15_000);

  runner.events.on('job:success', ({ job }) => {
    if (
      job.task_identifier === 'foundation:test' &&
      typeof job.payload === 'object' &&
      job.payload !== null &&
      'probeId' in job.payload &&
      job.payload.probeId === probeId
    ) {
      completedTasks.add('foundation:test');
    }

    if (
      job.task_identifier === 'work-with-us:notify-inquiry' &&
      typeof job.payload === 'object' &&
      job.payload !== null &&
      'inquiryId' in job.payload &&
      job.payload.inquiryId === inquiryId
    ) {
      completedTasks.add('work-with-us:notify-inquiry');
    }

    if (completedTasks.size === 2) {
      clearTimeout(timeout);
      resolve();
    }
  });
});

try {
  const foundationJob = await runner.addJob(
    'foundation:test',
    {
      probeId,
      queuedAt: new Date().toISOString(),
    },
    { maxAttempts: 1 },
  );

  const notificationJob = await runner.addJob(
    'work-with-us:notify-inquiry',
    { inquiryId },
    { maxAttempts: 1 },
  );

  console.info(
    `[worker-smoke] queued foundationJobId=${foundationJob.id} notificationJobId=${notificationJob.id}`,
  );

  await completed;

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.to, recipientEmail);
  assert.equal(sentMessages[0]?.replyTo, inquiryEmail);
  assert.equal(
    sentMessages[0]?.idempotencyKey,
    `work-with-us-inquiry/${inquiryId}`,
  );
  assert.match(sentMessages[0]?.text ?? '', /durable inquiry/);

  const notification = await db
    .selectFrom('work_with_us_inquiry_notifications')
    .select([
      'state',
      'attempt_count',
      'provider',
      'provider_message_id',
      'recipient_email',
      'sent_at',
    ])
    .where('inquiry_id', '=', inquiryId)
    .executeTakeFirstOrThrow();

  assert.equal(notification.state, 'sent');
  assert.equal(notification.attempt_count, 1);
  assert.equal(notification.provider, 'smoke');
  assert.ok(notification.provider_message_id?.startsWith('smoke-'));
  assert.equal(notification.recipient_email, recipientEmail);
  assert.ok(notification.sent_at instanceof Date);

  console.info(
    `[worker-smoke] executed foundationJobId=${foundationJob.id} notificationJobId=${notificationJob.id}`,
  );
} finally {
  await runner.stop('Work with us worker smoke complete');
  await runner.promise;

  await db
    .deleteFrom('work_with_us_inquiries')
    .where('id', '=', inquiryId)
    .execute();

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

console.info(
  '[worker-smoke] graceful shutdown and asynchronous inquiry notification verified.',
);
