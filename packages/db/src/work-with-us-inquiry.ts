import type { PlatformLocale } from '@akiksystems/core';
import { randomUUID } from 'node:crypto';
import { sql, type Kysely } from 'kysely';

import type { Database } from './schema.js';

export const workWithUsInquiryRateLimit = {
  maxAccepted: 3,
  windowMs: 15 * 60 * 1000,
} as const;

export interface CreateWorkWithUsInquiryInput {
  submissionToken: string;
  locale: PlatformLocale;
  name: string;
  email: string;
  organization: string | null;
  message: string;
}

export type CreateWorkWithUsInquiryResult =
  | {
      status: 'created';
      inquiryId: string;
    }
  | {
      status: 'duplicate';
      inquiryId: string;
    }
  | {
      status: 'rate_limited';
      retryAfterSeconds: number;
    };

function emailRateLimitKey(email: string): string {
  return email.trim().toLowerCase();
}

export async function createWorkWithUsInquiry(
  db: Kysely<Database>,
  input: CreateWorkWithUsInquiryInput,
): Promise<CreateWorkWithUsInquiryResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - workWithUsInquiryRateLimit.windowMs);
  const emailKey = emailRateLimitKey(input.email);

  return db.transaction().execute(async (transaction) => {
    // The submission token makes retries idempotent. Lock it before the email
    // bucket so concurrent retries cannot race the unique constraint.
    await sql`
      select pg_advisory_xact_lock(
        hashtextextended(${input.submissionToken}, 127)
      )
    `.execute(transaction);

    const existing = await transaction
      .selectFrom('work_with_us_inquiries')
      .select('id')
      .where('submission_token', '=', input.submissionToken)
      .executeTakeFirst();

    if (existing !== undefined) {
      return {
        status: 'duplicate' as const,
        inquiryId: existing.id,
      };
    }

    // Serialize one normalized email bucket at a time. The rate-limit decision
    // and the insert therefore remain atomic even under concurrent submits.
    await sql`
      select pg_advisory_xact_lock(
        hashtextextended(${emailKey}, 128)
      )
    `.execute(transaction);

    const recent = await sql<{ created_at: Date }>`
      select created_at
      from work_with_us_inquiries
      where lower(email) = ${emailKey}
        and created_at >= ${windowStart}
      order by created_at asc
    `.execute(transaction);

    if (recent.rows.length >= workWithUsInquiryRateLimit.maxAccepted) {
      const oldest = recent.rows[0]?.created_at ?? now;
      const availableAt =
        oldest.getTime() + workWithUsInquiryRateLimit.windowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((availableAt - now.getTime()) / 1000),
      );

      return {
        status: 'rate_limited' as const,
        retryAfterSeconds,
      };
    }

    const inquiryId = randomUUID();

    await transaction
      .insertInto('work_with_us_inquiries')
      .values({
        id: inquiryId,
        submission_token: input.submissionToken,
        locale: input.locale,
        name: input.name,
        email: input.email,
        organization: input.organization,
        message: input.message,
        created_at: now,
      })
      .execute();

    return {
      status: 'created' as const,
      inquiryId,
    };
  });
}
