import { randomUUID } from 'node:crypto';

import { startWorker } from '../src/runtime.js';

const connectionString = process.env.DATABASE_URL;

if (connectionString === undefined || connectionString.trim() === '') {
  throw new Error('DATABASE_URL is required for the worker smoke test.');
}

const probeId = randomUUID();
const runner = await startWorker({ connectionString });

const completed = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Timed out waiting for the foundation:test job to execute.'));
  }, 15_000);

  runner.events.on('job:success', ({ job }) => {
    if (
      job.task_identifier === 'foundation:test' &&
      typeof job.payload === 'object' &&
      job.payload !== null &&
      'probeId' in job.payload &&
      job.payload.probeId === probeId
    ) {
      clearTimeout(timeout);
      resolve();
    }
  });
});

try {
  const job = await runner.addJob(
    'foundation:test',
    {
      probeId,
      queuedAt: new Date().toISOString(),
    },
    { maxAttempts: 1 },
  );

  console.info(`[worker-smoke] queued jobId=${job.id} probeId=${probeId}`);

  await completed;
  console.info(`[worker-smoke] executed jobId=${job.id} probeId=${probeId}`);
} finally {
  await runner.stop('AKS-005 smoke test complete');
  await runner.promise;
}

console.info('[worker-smoke] graceful shutdown verified.');
