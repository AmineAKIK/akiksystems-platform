import { parseDatabaseCommandEnv } from '@akiksystems/config/env';
import { createLogger } from '@akiksystems/config/observability';
import {
  getWorkWithUsInquiryNotificationDelivery,
  markWorkWithUsInquiryNotificationQueued,
  markWorkWithUsInquiryNotificationQueueFailed,
} from '@akiksystems/db';
import { addJobAdhoc } from 'graphile-worker';

import { appDb } from './db.server';

const env = parseDatabaseCommandEnv(process.env);
const logger = createLogger({
  service: 'web',
  redactValues: [env.DATABASE_URL],
});

export async function queueWorkWithUsInquiryNotification(
  inquiryId: string,
): Promise<boolean> {
  const delivery = await getWorkWithUsInquiryNotificationDelivery(
    appDb,
    inquiryId,
  );

  if (delivery === null || delivery.state === 'sent') {
    return delivery?.state === 'sent';
  }

  try {
    await addJobAdhoc(
      { connectionString: env.DATABASE_URL },
      'work-with-us:notify-inquiry',
      { inquiryId },
      { maxAttempts: 8 },
    );

    await markWorkWithUsInquiryNotificationQueued(appDb, inquiryId);
    return true;
  } catch (error) {
    try {
      await markWorkWithUsInquiryNotificationQueueFailed(
        appDb,
        inquiryId,
        'Notification job could not be queued. Retry from administration.',
      );
    } catch (stateError) {
      logger.error('work_with_us.notification_queue_state_failed', stateError, {
        inquiryId,
      });
    }

    logger.error('work_with_us.notification_queue_failed', error, {
      inquiryId,
    });
    return false;
  }
}
