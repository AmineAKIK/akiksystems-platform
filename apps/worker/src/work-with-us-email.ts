import type { WorkerEnv } from '@akiksystems/config/env';

export interface WorkWithUsEmailMessage {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}

export interface WorkWithUsEmailTransport {
  readonly provider: string;
  send(message: WorkWithUsEmailMessage): Promise<{ messageId: string }>;
}

interface ResendEmailResponse {
  id?: unknown;
}

export function createWorkWithUsEmailTransport(
  env: WorkerEnv,
): WorkWithUsEmailTransport | null {
  if (
    env.WORK_WITH_US_EMAIL_PROVIDER === undefined ||
    env.RESEND_API_KEY === undefined ||
    env.WORK_WITH_US_EMAIL_FROM === undefined
  ) {
    return null;
  }

  const apiKey = env.RESEND_API_KEY;
  const from = env.WORK_WITH_US_EMAIL_FROM;

  return {
    provider: 'resend',

    async send(message) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': message.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          reply_to: message.replyTo,
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const body = (await response.text()).slice(0, 1_000);
        throw new Error(
          `Resend rejected Work with us notification: HTTP ${response.status}${body === '' ? '' : ` · ${body}`}`,
        );
      }

      const payload = (await response.json()) as ResendEmailResponse;
      if (typeof payload.id !== 'string' || payload.id.trim() === '') {
        throw new Error(
          'Resend accepted the request without returning an email identifier.',
        );
      }

      return { messageId: payload.id };
    },
  };
}
