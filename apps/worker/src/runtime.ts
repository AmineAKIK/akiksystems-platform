import {
  createLogger,
  type StructuredLogger,
} from '@akiksystems/config/observability';
import { run, type Runner } from 'graphile-worker';

import { taskList } from './tasks/index.js';

export interface StartWorkerOptions {
  connectionString: string;
  logger?: StructuredLogger;
}

export async function startWorker({
  connectionString,
  logger = createLogger({
    service: 'worker',
    redactValues: [connectionString],
  }),
}: StartWorkerOptions): Promise<Runner> {
  if (connectionString.trim() === '') {
    throw new Error('A non-empty PostgreSQL connection string is required to start the worker.');
  }

  const runner = await run({
    connectionString,
    concurrency: 1,
    noHandleSignals: true,
    taskList,
  });

  runner.events.on('job:success', ({ job, worker }) => {
    logger.info('worker.job.completed', {
      task: job.task_identifier,
      jobId: job.id,
      workerId: worker.workerId,
    });
  });

  runner.events.on('job:error', ({ job, error }) => {
    logger.error('worker.job.failed', error, {
      task: job.task_identifier,
      jobId: job.id,
    });
  });

  logger.info('worker.started', {
    concurrency: 1,
  });

  return runner;
}
