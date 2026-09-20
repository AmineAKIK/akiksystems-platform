import { parseWorkerEnv } from '@akiksystems/config/env';
import { createLogger } from '@akiksystems/config/observability';

import { startWorker } from './runtime.js';

const env = parseWorkerEnv(process.env);
const logger = createLogger({
  service: 'worker',
  redactValues: [env.DATABASE_URL],
});
const runner = await startWorker({
  connectionString: env.DATABASE_URL,
  logger,
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('worker.shutdown.started', { signal });

  try {
    await runner.stop(`Received ${signal}`);
    await runner.promise;
    logger.info('worker.shutdown.completed', { signal });
  } catch (error) {
    logger.error('worker.shutdown.failed', error, { signal });
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

await runner.promise;
