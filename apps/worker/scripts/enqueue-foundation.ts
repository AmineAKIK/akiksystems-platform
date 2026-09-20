import { randomUUID } from 'node:crypto';

import { parseWorkerEnv } from '@akiksystems/config/env';
import { addJobAdhoc } from 'graphile-worker';

const env = parseWorkerEnv(process.env);
const probeId = randomUUID();
const queuedAt = new Date().toISOString();

const job = await addJobAdhoc(
  { connectionString: env.DATABASE_URL },
  'foundation:test',
  { probeId, queuedAt },
  { maxAttempts: 1 },
);

console.info(
  `[worker] queued foundation:test jobId=${job.id} probeId=${probeId} queuedAt=${queuedAt}`,
);
