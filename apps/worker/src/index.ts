import { parseWorkerEnv } from '@akiksystems/config/env';
import { createLogger } from '@akiksystems/config/observability';

import { startWorker } from './runtime.js';
import { createWorkWithUsEmailTransport } from './work-with-us-email.js';

const env = parseWorkerEnv(process.env);
const workWithUsEmailTransport = createWorkWithUsEmailTransport(env);
const logger = createLogger({
  service: 'worker',
  redactValues: [env.DATABASE_URL, env.RESEND_API_KEY],
});
const runner = await startWorker({
  connectionString: env.DATABASE_URL,
  logger,
  workWithUsEmailTransport,
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
