import type { TaskList } from 'graphile-worker';

import type { WorkWithUsEmailTransport } from '../work-with-us-email.js';
import { foundationTestTask } from './foundation-test.js';
import { createWorkWithUsInquiryNotificationTask } from './work-with-us-notification.js';

export function createTaskList({
  connectionString,
  workWithUsEmailTransport,
}: {
  connectionString: string;
  workWithUsEmailTransport: WorkWithUsEmailTransport | null;
}) {
  return {
    'foundation:test': foundationTestTask,
    'work-with-us:notify-inquiry': createWorkWithUsInquiryNotificationTask({
      connectionString,
      transport: workWithUsEmailTransport,
    }),
  } satisfies TaskList;
}
