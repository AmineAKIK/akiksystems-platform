import { createLogger } from '@akiksystems/config/observability';
import {
  createDatabase,
  getWorkWithUsInquiryNotificationDelivery,
  markWorkWithUsInquiryNotificationBlocked,
  markWorkWithUsInquiryNotificationFailed,
  markWorkWithUsInquiryNotificationSending,
  markWorkWithUsInquiryNotificationSent,
} from '@akiksystems/db';
import type { Task } from 'graphile-worker';

import type { WorkWithUsEmailTransport } from '../work-with-us-email.js';

function errorMessage(error: unknown): string {
  return (
    error instanceof Error ? error.message : 'Unknown notification transport error.'
  ).slice(0, 1_000);
}

function notificationText(delivery: {
  locale: 'en' | 'fr';
  name: string;
  email: string;
  organization: string | null;
  message: string;
  createdAt: Date;
}): string {
  return [
    'New Work with us inquiry',
    '',
    `Received: ${delivery.createdAt.toISOString()}`,
    `Locale: ${delivery.locale.toUpperCase()}`,
    `Name: ${delivery.name}`,
    `Email: ${delivery.email}`,
    `Organization: ${delivery.organization ?? '—'}`,
    '',
    'Message',
    '-------',
    delivery.message,
    '',
    'The inquiry is already stored in the AkikSystems administration inbox.',
  ].join('\n');
}

export function createWorkWithUsInquiryNotificationTask({
  connectionString,
  transport,
}: {
  connectionString: string;
  transport: WorkWithUsEmailTransport | null;
}): Task<'work-with-us:notify-inquiry'> {
  const logger = createLogger({ service: 'worker' });

  return async (payload, helpers) => {
    const db = createDatabase(connectionString);

    try {
      const delivery = await getWorkWithUsInquiryNotificationDelivery(
        db,
        payload.inquiryId,
      );

      if (delivery === null) {
        logger.warn('work_with_us.notification.inquiry_missing', {
          inquiryId: payload.inquiryId,
          jobId: helpers.job.id,
        });
        return;
      }

      if (delivery.state === 'sent') {
        logger.info('work_with_us.notification.already_sent', {
          inquiryId: payload.inquiryId,
          jobId: helpers.job.id,
          providerMessageId: delivery.providerMessageId,
        });
        return;
      }

      if (delivery.recipientEmail === null) {
        await markWorkWithUsInquiryNotificationBlocked(
          db,
          payload.inquiryId,
          'Notification recipient is not configured in administration.',
        );
        logger.warn('work_with_us.notification.recipient_missing', {
          inquiryId: payload.inquiryId,
          jobId: helpers.job.id,
        });
        return;
      }

      if (transport === null) {
        await markWorkWithUsInquiryNotificationBlocked(
          db,
          payload.inquiryId,
          'Email transport is not configured on the worker.',
        );
        logger.warn('work_with_us.notification.transport_missing', {
          inquiryId: payload.inquiryId,
          jobId: helpers.job.id,
        });
        return;
      }

      await markWorkWithUsInquiryNotificationSending(
        db,
        payload.inquiryId,
        delivery.recipientEmail,
        transport.provider,
      );

      try {
        const sent = await transport.send({
          to: delivery.recipientEmail,
          replyTo: delivery.email,
          subject: `[AkikSystems] Work with us · ${delivery.name}`,
          text: notificationText(delivery),
          idempotencyKey: `work-with-us-inquiry/${delivery.inquiryId}`,
        });

        await markWorkWithUsInquiryNotificationSent(
          db,
          payload.inquiryId,
          transport.provider,
          sent.messageId,
        );

        logger.info('work_with_us.notification.sent', {
          inquiryId: payload.inquiryId,
          jobId: helpers.job.id,
          provider: transport.provider,
          providerMessageId: sent.messageId,
        });
      } catch (error) {
        await markWorkWithUsInquiryNotificationFailed(
          db,
          payload.inquiryId,
          errorMessage(error),
        );
        throw error;
      }
    } finally {
      await db.destroy();
    }
  };
}
