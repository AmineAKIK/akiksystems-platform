import { parseWorkerEnv } from '@akiksystems/config/env';

import { startWorker } from './runtime.js';

const env = parseWorkerEnv(process.env);
const runner = await startWorker({ connectionString: env.DATABASE_URL });

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.info(`[worker] ${signal} received; starting graceful shutdown.`);

  await runner.stop(`Received ${signal}`);
  await runner.promise;

  console.info('[worker] graceful shutdown complete.');
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

await runner.promise;
