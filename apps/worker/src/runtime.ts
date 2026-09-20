import { run, type Runner } from 'graphile-worker';

import { taskList } from './tasks/index.js';

export interface StartWorkerOptions {
  connectionString: string;
}

export async function startWorker({ connectionString }: StartWorkerOptions): Promise<Runner> {
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
    console.info(
      `[worker] completed task=${job.task_identifier} jobId=${job.id} workerId=${worker.workerId}`,
    );
  });

  runner.events.on('job:error', ({ job, error }) => {
    console.error(`[worker] failed task=${job.task_identifier} jobId=${job.id}`, error);
  });

  console.info('[worker] Graphile Worker started.');

  return runner;
}
