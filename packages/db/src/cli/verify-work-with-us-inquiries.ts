import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createWorkWithUsInquiry } from '../work-with-us-inquiry.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());
const marker = randomUUID();
const email = `inquiry-${marker}@example.invalid`;
const secondEmail = `inquiry-other-${marker}@example.invalid`;
const createdIds: string[] = [];

try {
  const firstToken = randomUUID();
  const first = await createWorkWithUsInquiry(db, {
    submissionToken: firstToken,
    locale: 'en',
    name: 'Inquiry qualification',
    email,
    organization: 'AkikSystems qualification',
    message: 'Persist this inquiry before any notification transport exists.',
  });

  assert.equal(first.status, 'created');
  if (first.status === 'created') createdIds.push(first.inquiryId);

  const duplicate = await createWorkWithUsInquiry(db, {
    submissionToken: firstToken,
    locale: 'en',
    name: 'Changed retry payload',
    email,
    organization: null,
    message: 'A transport retry must not create a second inquiry.',
  });

  assert.equal(duplicate.status, 'duplicate');
  if (duplicate.status === 'duplicate' && first.status === 'created') {
    assert.equal(duplicate.inquiryId, first.inquiryId);
  }

  for (let index = 0; index < 2; index += 1) {
    const result = await createWorkWithUsInquiry(db, {
      submissionToken: randomUUID(),
      locale: index === 0 ? 'fr' : 'en',
      name: `Rate qualification ${index + 1}`,
      email,
      organization: null,
      message: `Accepted message ${index + 2} for the same email bucket.`,
    });

    assert.equal(result.status, 'created');
    if (result.status === 'created') createdIds.push(result.inquiryId);
  }

  const limited = await createWorkWithUsInquiry(db, {
    submissionToken: randomUUID(),
    locale: 'fr',
    name: 'Rate limited qualification',
    email,
    organization: null,
    message: 'This fourth accepted submission must be rejected.',
  });

  assert.equal(limited.status, 'rate_limited');
  if (limited.status === 'rate_limited') {
    assert.ok(limited.retryAfterSeconds > 0);
  }

  const independent = await createWorkWithUsInquiry(db, {
    submissionToken: randomUUID(),
    locale: 'fr',
    name: 'Independent email bucket',
    email: secondEmail,
    organization: null,
    message: 'A separate email address must remain independent.',
  });

  assert.equal(independent.status, 'created');
  if (independent.status === 'created') createdIds.push(independent.inquiryId);

  const persisted = await db
    .selectFrom('work_with_us_inquiries')
    .select([
      'id',
      'submission_token',
      'locale',
      'name',
      'email',
      'organization',
      'message',
    ])
    .where('submission_token', '=', firstToken)
    .execute();

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.locale, 'en');
  assert.equal(persisted[0]?.name, 'Inquiry qualification');
  assert.equal(persisted[0]?.email, email);
  assert.equal(persisted[0]?.organization, 'AkikSystems qualification');
  assert.equal(
    persisted[0]?.message,
    'Persist this inquiry before any notification transport exists.',
  );

  process.stdout.write(
    'Work with us inquiry qualification passed: persistence is durable, retries are idempotent, and the database-backed email bucket rate limit is atomic.\n',
  );
} finally {
  if (createdIds.length > 0) {
    await db
      .deleteFrom('work_with_us_inquiries')
      .where('id', 'in', createdIds)
      .execute();
  }
  await db.destroy();
}
