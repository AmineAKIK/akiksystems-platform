import { randomUUID } from 'node:crypto';

import { addJobAdhoc } from 'graphile-worker';

const connectionString = process.env.DATABASE_URL;

if (connectionString === undefined || connectionString.trim() === '') {
  throw new Error('DATABASE_URL is required to enqueue a worker job.');
}

const probeId = randomUUID();
const queuedAt = new Date().toISOString();

const job = await addJobAdhoc(
  { connectionString },
  'foundation:test',
  { probeId, queuedAt },
  { maxAttempts: 1 },
);

console.info(
  `[worker] queued foundation:test jobId=${job.id} probeId=${probeId} queuedAt=${queuedAt}`,
);
