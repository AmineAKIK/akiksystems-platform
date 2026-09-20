import { createLogger } from '@akiksystems/config/observability';
import type { Task } from 'graphile-worker';

const logger = createLogger({ service: 'worker' });

export const foundationTestTask: Task<'foundation:test'> = async (payload, helpers) => {
  logger.info('worker.foundation.executed', {
    probeId: payload.probeId,
    queuedAt: payload.queuedAt,
    jobId: helpers.job.id,
  });
};
